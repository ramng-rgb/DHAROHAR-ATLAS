"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Box, Images, BookOpen, Sparkles, Compass 
} from "lucide-react";

interface SectionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionItem[] = [
  { id: "overview", label: "Overview", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "twin-3d", label: "3D Digital Twin", icon: <Box className="w-3.5 h-3.5" /> },
  { id: "gallery", label: "Gallery", icon: <Images className="w-3.5 h-3.5" /> },
  { id: "folklore", label: "Folklore", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "observations", label: "Observations", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "nearby", label: "Nearby Sites", icon: <Compass className="w-3.5 h-3.5" /> },
];

export function StickySectionNav() {
  const [activeId, setActiveId] = useState<string>("overview");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="Site page sections"
      className="sticky top-16 z-30 w-full py-2 bg-[#0E0C09]/90 backdrop-blur-xl border-y border-[#D4AF37]/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          {SECTIONS.map((sec) => {
            const isActive = activeId === sec.id;
            return (
              <li key={sec.id} className="flex-shrink-0">
                <button
                  onClick={() => scrollTo(sec.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-serif font-bold transition-all ${
                    isActive
                      ? "bg-[#D4AF37] text-[#1A1510] shadow-md scale-105"
                      : "text-[#D8C3A5] hover:text-white hover:bg-white/5"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {sec.icon}
                  <span>{sec.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
