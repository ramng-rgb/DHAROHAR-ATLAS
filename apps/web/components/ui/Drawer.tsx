"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = "",
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content: Right slide-over on md+, bottom sheet on mobile */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Site preview panel"}
        className={`relative w-full md:w-[460px] lg:w-[500px] h-[85vh] md:h-full mt-auto md:mt-0 bg-[#120E0A]/95 border-t md:border-t-0 md:border-l border-goldLeaf/30 shadow-2xl pointer-events-auto flex flex-col z-10 transition-transform duration-300 ease-in-out ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 md:p-5 border-b border-sandstone/15">
          <div className="flex-1 pr-3">
            {title && <h2 className="text-lg md:text-xl font-serif font-bold text-parchment-100">{title}</h2>}
            {subtitle && <p className="text-xs text-sandstone mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-full text-sandstone hover:text-goldLeaf hover:bg-parchment-900 transition-colors focus:ring-2 focus:ring-goldLeaf focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 scrollbar-thin scrollbar-thumb-sandstone/30">
          {children}
        </div>
      </section>
    </div>
  );
};
