import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "verified" | "likely" | "unverified" | "era" | "type" | "gold" | "outline";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "gold",
  className = "",
}) => {
  const baseClasses =
    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide uppercase";

  const variantClasses = {
    verified: "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40",
    likely: "bg-amber-950/80 text-amber-300 border border-amber-500/40",
    unverified: "bg-stone-900/80 text-stone-400 border border-stone-600/40",
    era: "bg-indigoInk-light text-parchment-200 border border-sandstone/30 font-serif",
    type: "bg-parchment-900 text-goldLeaf border border-goldLeaf/30",
    gold: "bg-goldLeaf/15 text-goldLeaf border border-goldLeaf/40",
    outline: "bg-transparent text-sandstone border border-sandstone/30",
  }[variant];

  return <span className={`${baseClasses} ${variantClasses} ${className}`}>{children}</span>;
};
