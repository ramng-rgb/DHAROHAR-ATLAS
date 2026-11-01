import React from "react";

export interface JaaliDividerProps {
  className?: string;
  variant?: "gold" | "subtle" | "terracotta";
}

export const JaaliDivider: React.FC<JaaliDividerProps> = ({
  className = "",
  variant = "gold",
}) => {
  const strokeColor = {
    gold: "#D4AF37",
    subtle: "#8E8D8A",
    terracotta: "#C85A32",
  }[variant];

  return (
    <div className={`w-full flex items-center justify-center my-4 overflow-hidden select-none ${className}`}>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-goldLeaf/30 to-goldLeaf/60" />
      <svg
        width="120"
        height="24"
        viewBox="0 0 120 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-3 opacity-80"
        aria-hidden="true"
      >
        {/* Central 8-pointed star rosette */}
        <path
          d="M60 2 L65 7 L72 7 L67 12 L69 19 L63 15 L60 22 L57 15 L51 19 L53 12 L48 7 L55 7 Z"
          stroke={strokeColor}
          strokeWidth="1.2"
          fill="none"
        />
        {/* Left jaali lattice diamonds */}
        <polygon points="30,12 36,6 42,12 36,18" stroke={strokeColor} strokeWidth="1" fill="none" opacity="0.6" />
        <polygon points="12,12 18,6 24,12 18,18" stroke={strokeColor} strokeWidth="1" fill="none" opacity="0.4" />
        {/* Right jaali lattice diamonds */}
        <polygon points="90,12 96,6 102,12 96,18" stroke={strokeColor} strokeWidth="1" fill="none" opacity="0.6" />
        <polygon points="108,12 114,6 120,12 114,18" stroke={strokeColor} strokeWidth="1" fill="none" opacity="0.4" />
        {/* Linking lines */}
        <line x1="24" y1="12" x2="30" y2="12" stroke={strokeColor} strokeWidth="0.8" opacity="0.5" />
        <line x1="42" y1="12" x2="48" y2="12" stroke={strokeColor} strokeWidth="0.8" opacity="0.5" />
        <line x1="72" y1="12" x2="78" y2="12" stroke={strokeColor} strokeWidth="0.8" opacity="0.5" />
        <line x1="102" y1="12" x2="108" y2="12" stroke={strokeColor} strokeWidth="0.8" opacity="0.5" />
      </svg>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-goldLeaf/30 to-goldLeaf/60" />
    </div>
  );
};
