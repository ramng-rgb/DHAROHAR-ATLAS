import React from "react";
import { X } from "lucide-react";

export interface ChipProps {
  label: string;
  count?: number;
  selected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  count,
  selected = false,
  onToggle,
  onRemove,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-150 ${
        selected
          ? "bg-goldLeaf text-parchment-950 font-semibold shadow-sm"
          : "bg-parchment-900/90 text-parchment-200 border border-sandstone/25 hover:border-goldLeaf/50 hover:text-goldLeaf"
      } ${className}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
            selected ? "bg-parchment-950 text-goldLeaf font-bold" : "bg-black/40 text-sandstone"
          }`}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove filter ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-red-400 p-0.5"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
};
