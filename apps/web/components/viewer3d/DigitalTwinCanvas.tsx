"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Model3DDetail, HotspotDetail } from "@/lib/api-client";
import type { LightingPreset, BackgroundMode } from "./ViewerControlsBar";

interface DigitalTwinCanvasProps {
  model: Model3DDetail;
  lighting: LightingPreset;
  sunAngle: number;
  wireframe: boolean;
  background: BackgroundMode;
  showAnnotations: boolean;
  measurementActive: boolean;
  activeHotspot: HotspotDetail | null;
  onSelectHotspot: (hotspot: HotspotDetail) => void;
  onMeasureComplete: (distanceMeters: number | null) => void;
  resetViewTrigger: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

function StepwellModel({
  url,
  wireframe,
  onModelLoaded,
  measurementActive,
  onSurfaceClick,
}: {
  url: string;
  wireframe: boolean;
  onModelLoaded: (bounds: THREE.Box3) => void;
  measurementActive: boolean;
  onSurfaceClick: (point: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.wireframe = wireframe;
          }
        }
      });
      const box = new THREE.Box3().setFromObject(scene);
      onModelLoaded(box);
    }
  }, [scene, wireframe, onModelLoaded]);

  return (
    <primitive
      ref={modelRef}
      object={scene}
      onClick={(e: any) => {
        if (measurementActive && e.point) {
          e.stopPropagation();
          onSurfaceClick(e.point);
        }
      }}
    />
  );
}

function HotspotBillboard({
  hotspot,
  index,
  isSelected,
  onSelect,
}: {
  hotspot: HotspotDetail;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [x, y, z] = hotspot.position;

  return (
    <group position={[x, y, z]}>
      {/* 3D Core Sphere */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? "#C85A32" : "#D4AF37"}
          emissive={isSelected ? "#E07A5F" : "#F3C649"}
          emissiveIntensity={isSelected ? 1.0 : 0.6}
        />
      </mesh>

      {/* HTML Tag */}
      <Html distanceFactor={14} position={[0, 0.35, 0]} center>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`cursor-pointer px-2 py-0.5 rounded-full border shadow-2xl flex items-center gap-1.5 transition-all text-[11px] font-serif font-bold whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#D4AF37] ${
            isSelected
              ? "bg-[#C85A32] text-white border-white scale-110"
              : "bg-[#14100C]/90 text-[#F6F1E9] border-[#D4AF37]/80 hover:scale-105"
          }`}
          aria-label={`Hotspot ${index + 1}: ${hotspot.label}`}
        >
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
              isSelected ? "bg-white text-[#C85A32]" : "bg-[#D4AF37] text-[#1A1510]"
            }`}
          >
            {index + 1}
          </span>
          <span>{hotspot.label}</span>
        </button>
      </Html>
    </group>
  );
}

function CameraAndLightingController({
  lighting,
  sunAngle,
  activeHotspot,
  resetViewTrigger,
  modelBounds,
}: {
  lighting: LightingPreset;
  sunAngle: number;
  activeHotspot: HotspotDetail | null;
  resetViewTrigger: number;
  modelBounds: THREE.Box3 | null;
}) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<any>(null);

  // Smooth camera animation target
  const targetCamPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);

  // Reset or focus camera
  useEffect(() => {
    if (activeHotspot) {
      const [cx, cy, cz] = activeHotspot.camera_position;
      const [tx, ty, tz] = activeHotspot.camera_target;
      targetCamPos.current = new THREE.Vector3(cx, cy, cz);
      targetLookAt.current = new THREE.Vector3(tx, ty, tz);
      invalidate();
    }
  }, [activeHotspot, invalidate]);

  useEffect(() => {
    if (resetViewTrigger > 0 || !activeHotspot) {
      if (modelBounds) {
        const center = new THREE.Box3().copy(modelBounds).getCenter(new THREE.Vector3());
        targetCamPos.current = new THREE.Vector3(center.x, center.y + 4.0, center.z + 10.0);
        targetLookAt.current = center;
      } else {
        targetCamPos.current = new THREE.Vector3(0, 4, 10);
        targetLookAt.current = new THREE.Vector3(0, 0, 0);
      }
      invalidate();
    }
  }, [resetViewTrigger, modelBounds, invalidate]);

  useFrame((_, delta) => {
    if (targetCamPos.current && targetLookAt.current && controlsRef.current) {
      camera.position.lerp(targetCamPos.current, 4.0 * delta);
      controlsRef.current.target.lerp(targetLookAt.current, 4.0 * delta);
      controlsRef.current.update();

      if (camera.position.distanceTo(targetCamPos.current) < 0.05) {
        targetCamPos.current = null;
        targetLookAt.current = null;
      }
      invalidate();
    }
  });

  // Calculate sun position from angle
  const rad = (sunAngle * Math.PI) / 180;
  const sunX = Math.cos(rad) * 12;
  const sunZ = Math.sin(rad) * 12;
  const sunY = lighting === "dusk" ? 3 : 10;

  let ambIntensity = 0.6;
  let dirIntensity = 1.2;
  let dirColor = "#FFF8EE";
  let ambColor = "#FFEEDD";

  if (lighting === "dusk") {
    ambIntensity = 0.4;
    dirIntensity = 1.0;
    dirColor = "#FFAA55";
    ambColor = "#774433";
  } else if (lighting === "night") {
    ambIntensity = 0.2;
    dirIntensity = 0.5;
    dirColor = "#88AAEE";
    ambColor = "#112244";
  }

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={1.0}
        maxDistance={28.0}
        onChange={() => invalidate()}
      />
      <ambientLight intensity={ambIntensity} color={ambColor} />
      <directionalLight
        position={[sunX, sunY, sunZ]}
        intensity={dirIntensity}
        color={dirColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      {lighting === "night" && (
        <pointLight position={[0, -1.0, 0]} intensity={1.5} color="#FF9933" distance={10} />
      )}
    </>
  );
}

export function DigitalTwinCanvas({
  model,
  lighting,
  sunAngle,
  wireframe,
  background,
  showAnnotations,
  measurementActive,
  activeHotspot,
  onSelectHotspot,
  onMeasureComplete,
  resetViewTrigger,
  canvasRef,
}: DigitalTwinCanvasProps) {
  const [modelBounds, setModelBounds] = useState<THREE.Box3 | null>(null);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [currentDist, setCurrentDist] = useState<number | null>(null);

  const handleSurfaceClick = useCallback((point: THREE.Vector3) => {
    if (!measurementActive) return;
    setMeasurePoints((prev) => {
      if (prev.length >= 2) {
        return [point];
      }
      const updated = [...prev, point];
      if (updated.length === 2) {
        const d = updated[0].distanceTo(updated[1]) * (model.scale_factor || 1.0);
        setCurrentDist(d);
        onMeasureComplete(d);
      }
      return updated;
    });
  }, [measurementActive, model.scale_factor, onMeasureComplete]);

  // Clear measurement if deactivated
  useEffect(() => {
    if (!measurementActive) {
      setMeasurePoints([]);
      setCurrentDist(null);
      onMeasureComplete(null);
    }
  }, [measurementActive, onMeasureComplete]);

  const bgColor =
    background === "parchment"
      ? "#14100C"
      : background === "slate"
      ? "#0A0D14"
      : undefined;

  return (
    <div
      className="relative w-full h-[480px] sm:h-[580px] rounded-3xl overflow-hidden border border-[#D4AF37]/50 shadow-2xl transition-colors duration-500"
      style={{ backgroundColor: bgColor || "transparent" }}
    >
      <Canvas
        ref={canvasRef}
        shadows
        frameloop="demand"
        camera={{ position: [0, 4, 10], fov: 45 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1.5)]}
      >
        <CameraAndLightingController
          lighting={lighting}
          sunAngle={sunAngle}
          activeHotspot={activeHotspot}
          resetViewTrigger={resetViewTrigger}
          modelBounds={modelBounds}
        />

        <React.Suspense fallback={null}>
          <StepwellModel
            url={model.model_url}
            wireframe={wireframe}
            onModelLoaded={setModelBounds}
            measurementActive={measurementActive}
            onSurfaceClick={handleSurfaceClick}
          />

          {/* Hotspots */}
          {showAnnotations &&
            model.hotspots.map((h, i) => (
              <HotspotBillboard
                key={h.id}
                hotspot={h}
                index={i}
                isSelected={activeHotspot?.id === h.id}
                onSelect={() => onSelectHotspot(h)}
              />
            ))}

          {/* Measurement 3D line & pins */}
          {measurePoints.map((pt, idx) => (
            <mesh key={idx} position={pt}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#C85A32" emissive="#E07A5F" />
            </mesh>
          ))}

          {measurePoints.length === 2 && (
            <>
              <Line
                points={[measurePoints[0], measurePoints[1]]}
                color="#C85A32"
                lineWidth={3}
                dashed
                dashScale={5}
                dashSize={0.2}
                gapSize={0.1}
              />
              <Html
                position={[
                  (measurePoints[0].x + measurePoints[1].x) / 2,
                  (measurePoints[0].y + measurePoints[1].y) / 2 + 0.35,
                  (measurePoints[0].z + measurePoints[1].z) / 2,
                ]}
                center
              >
                <div className="bg-[#1A1510] text-white px-2.5 py-1 rounded-md border border-[#C85A32] shadow-xl text-xs font-mono font-bold whitespace-nowrap">
                  {currentDist !== null ? `${currentDist.toFixed(2)} m` : "..."}
                </div>
              </Html>
            </>
          )}
        </React.Suspense>
      </Canvas>

      {/* Measurement Active Floating Tooltip */}
      {measurementActive && (
        <div className="absolute top-4 left-4 z-20 glass-panel-gold bg-[#14100C]/90 p-3 rounded-xl border border-[#C85A32] text-xs text-white max-w-xs space-y-1 animate-pulse">
          <div className="font-bold text-[#E07A5F] flex items-center justify-between">
            <span>Measurement Caliper Active</span>
            {currentDist !== null && (
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {currentDist.toFixed(2)} m
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#D8C3A5]">
            {measurePoints.length === 0
              ? "Click first surface point..."
              : measurePoints.length === 1
              ? "Click second point to measure distance..."
              : "Distance calculated. Click surface to measure another span."}
          </p>
          <div className="text-[10px] text-[#D8C3A5]/70 pt-1 border-t border-white/10">
            {model.scale_calibrated ? "Metrically calibrated" : "*Scale is approximate based on ASI architectural drawings."}
          </div>
        </div>
      )}

      {/* Mobile Touch Instruction Pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-[#D8C3A5] border border-white/10 hidden sm:block">
        One-finger drag to orbit • Scroll to zoom • Right-click drag to pan
      </div>
    </div>
  );
}
