"use client";

import React, { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Center } from "@react-three/drei";
import * as THREE from "three";
import { 
  Sun, Moon, RotateCcw, Ruler, Eye, X, Info, 
  Layers, Maximize2, Sparkles, MapPin
} from "lucide-react";
import { Model3D, Hotspot } from "@/lib/api";

function ModelMesh({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);

  React.useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.material) {
          (m.material as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
    });
  }, [scene, wireframe]);

  return <primitive object={scene} scale={[1, 1, 1]} />;
}

function HotspotMarker({
  hotspot,
  onSelect
}: {
  hotspot: Hotspot;
  onSelect: (h: Hotspot) => void;
}) {
  return (
    <group position={[hotspot.position_x, hotspot.position_y, hotspot.position_z]}>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(hotspot); }}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#D4AF37" emissive="#F3C649" emissiveIntensity={0.6} />
      </mesh>
      <Html distanceFactor={12} position={[0, 0.35, 0]} center>
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(hotspot); }}
          className="cursor-pointer bg-[#1A1510]/90 text-[#F6F1E9] border border-[#D4AF37] px-2 py-0.5 rounded text-[11px] font-serif font-bold whitespace-nowrap shadow-lg hover:scale-110 transition-transform flex items-center gap-1"
        >
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          {hotspot.title}
        </div>
      </Html>
    </group>
  );
}

interface DigitalTwinViewerProps {
  model?: Model3D;
  fallbackImages?: string[];
  siteName: string;
}

export function DigitalTwinViewer3D({ model, fallbackImages, siteName }: DigitalTwinViewerProps) {
  const [dayNight, setDayNight] = useState<"day" | "night">("day");
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [measurementMode, setMeasurementMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  // If no 3D model exists, show graceful fallback photo carousel
  if (!model || !model.model_url) {
    return (
      <div className="w-full h-[520px] rounded-xl glass-panel overflow-hidden border border-[#D4AF37]/30 flex flex-col items-center justify-center p-6 text-center">
        <Info className="w-12 h-12 text-[#D4AF37] mb-3 opacity-80" />
        <h3 className="font-serif text-lg font-bold text-[#F6F1E9] mb-1">
          Photogrammetric Twin in Field Capture
        </h3>
        <p className="text-sm text-[#D8C3A5] max-w-md mb-6">
          High-density LiDAR and multi-angle drone scans for {siteName} are queued in the pipeline. View photographic documentation below.
        </p>
        {fallbackImages && fallbackImages.length > 0 && (
          <div className="flex gap-4 overflow-x-auto w-full max-w-3xl pb-2">
            {fallbackImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="Heritage Capture"
                className="w-64 h-40 object-cover rounded-lg border border-[#D4AF37]/40 flex-shrink-0"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const handlePointerDown = (e: any) => {
    if (!measurementMode) return;
    if (e.point) {
      const pt = new THREE.Vector3(e.point.x, e.point.y, e.point.z);
      if (measurePoints.length >= 2) {
        setMeasurePoints([pt]);
        setMeasuredDistance(null);
      } else {
        const next = [...measurePoints, pt];
        setMeasurePoints(next);
        if (next.length === 2) {
          const d = next[0].distanceTo(next[1]) * 4.2; // Scaled to meters
          setMeasuredDistance(round(d, 2));
        }
      }
    }
  };

  function round(val: number, decimals: number) {
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden glass-panel-gold border border-[#D4AF37]/50 shadow-2xl">
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [6, 4, 8], fov: 45 }}
        onPointerDown={handlePointerDown}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Day / Night Lighting Rig */}
        {dayNight === "day" ? (
          <>
            <ambientLight intensity={0.7} color="#FFF8EE" />
            <directionalLight
              position={[8, 12, 6]}
              intensity={1.8}
              color="#FFF1D0"
              castShadow
            />
            <directionalLight position={[-8, -6, -4]} intensity={0.4} color="#85A2B6" />
          </>
        ) : (
          <>
            <ambientLight intensity={0.2} color="#0D1B2A" />
            {/* Lamp-lit torchlight / lantern golden illuminance */}
            <pointLight position={[0, 0, 0]} intensity={3.5} color="#FFA500" distance={12} />
            <pointLight position={[2, 1, 2]} intensity={2.0} color="#FFD700" distance={8} />
            <directionalLight position={[-5, 8, -5]} intensity={0.5} color="#415A77" />
          </>
        )}

        <Suspense fallback={null}>
          <Center top>
            <ModelMesh url={model.model_url} wireframe={wireframe} />
          </Center>

          {/* Hotspots */}
          {model.hotspots &&
            model.hotspots.map((hs) => (
              <HotspotMarker
                key={hs.id}
                hotspot={hs}
                onSelect={(h) => setSelectedHotspot(h)}
              />
            ))}
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minDistance={2}
          maxDistance={25}
        />
      </Canvas>

      {/* Control Overlay Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="glass-panel rounded-lg p-1.5 flex items-center gap-1 border border-[#D4AF37]/40 shadow-lg">
          {/* Day / Night Toggle */}
          <button
            onClick={() => setDayNight(dayNight === "day" ? "night" : "day")}
            className={`p-2 rounded text-xs flex items-center gap-1.5 transition-colors ${
              dayNight === "night"
                ? "bg-[#D4AF37] text-indigoInk font-bold"
                : "text-[#D8C3A5] hover:text-white"
            }`}
            title="Toggle Day/Night Lamp Illumination"
          >
            {dayNight === "day" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="hidden sm:inline capitalize">{dayNight} Mode</span>
          </button>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded text-xs flex items-center gap-1 transition-colors ${
              autoRotate ? "text-[#D4AF37]" : "text-[#D8C3A5]/50"
            }`}
            title="Toggle Orbital Auto-Rotation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Wireframe Toggle */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-2 rounded text-xs flex items-center gap-1 transition-colors ${
              wireframe ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-[#D8C3A5] hover:text-white"
            }`}
            title="Toggle Structural Wireframe Mesh"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Measurement Caliper Tool */}
          <button
            onClick={() => {
              setMeasurementMode(!measurementMode);
              setMeasurePoints([]);
              setMeasuredDistance(null);
            }}
            className={`p-2 rounded text-xs flex items-center gap-1.5 transition-colors ${
              measurementMode
                ? "bg-[#C85A32] text-white font-bold"
                : "text-[#D8C3A5] hover:text-white"
            }`}
            title="Measure Metric Architectural Distances"
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden sm:inline">Caliper Tool</span>
          </button>
        </div>
      </div>

      {/* Measurement Banner */}
      {measurementMode && (
        <div className="absolute top-18 left-4 z-10 glass-panel p-2.5 rounded-lg border border-[#C85A32]/60 text-xs text-[#F6F1E9] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span>Click two surface points to calculate structural dimension:</span>
          {measuredDistance !== null ? (
            <span className="font-bold text-[#D4AF37] text-sm bg-black/40 px-2 py-0.5 rounded border border-[#D4AF37]">
              {measuredDistance} meters
            </span>
          ) : (
            <span className="text-[#D8C3A5]/70 italic">Point {measurePoints.length}/2 selected</span>
          )}
        </div>
      )}

      {/* Attribution Badge */}
      <div className="absolute bottom-3 right-4 z-10 text-[11px] text-[#D8C3A5]/70 font-serif bg-black/60 px-2.5 py-1 rounded border border-[#D4AF37]/20">
        GLB Digital Twin • {model.poly_count ? `${model.poly_count.toLocaleString()} Polygons` : "Draco Mesh"} • {model.license}
      </div>

      {/* Hotspot Inspection Drawer */}
      {selectedHotspot && (
        <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 glass-panel-gold p-6 z-20 overflow-y-auto border-l border-[#D4AF37] shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/30 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
              <MapPin className="w-4 h-4" />
              <span>Architectural Hotspot</span>
            </div>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-[#D8C3A5] hover:text-[#D4AF37]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedHotspot.media_url && (
            <div className="w-full h-44 rounded-lg overflow-hidden mb-4 border border-[#D4AF37]/40 shadow-lg">
              <img
                src={selectedHotspot.media_url}
                alt={selectedHotspot.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h3 className="font-serif text-lg font-bold text-[#F6F1E9] mb-2 leading-snug">
            {selectedHotspot.title}
          </h3>

          <p className="text-sm text-[#EFE6D8] leading-relaxed mb-6">
            {selectedHotspot.description}
          </p>

          <div className="p-3 rounded-lg bg-black/40 border border-[#D4AF37]/20 text-xs text-[#D8C3A5] space-y-1">
            <p><strong>Coordinates:</strong> X:{selectedHotspot.position_x.toFixed(2)}, Y:{selectedHotspot.position_y.toFixed(2)}, Z:{selectedHotspot.position_z.toFixed(2)}</p>
            <p><strong>Canon:</strong> Solanki Maru-Gurjara Subterranean Masonry</p>
          </div>
        </div>
      )}
    </div>
  );
}
