import React from "react";
import { Compass, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No monuments found",
  description = "No heritage sites matched your active filters and era boundaries.",
  onClearFilters,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-sandstone/25 rounded-xl bg-parchment-950/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-goldLeaf/10 border border-goldLeaf/30 flex items-center justify-center text-goldLeaf mb-4">
        <Compass className="w-6 h-6 animate-pulse" />
      </div>
      <h3 className="font-serif text-lg font-bold text-parchment-100 mb-1">{title}</h3>
      <p className="text-sm text-sandstone max-w-sm mb-5 leading-relaxed">{description}</p>
      {onClearFilters && (
        <Button variant="secondary" size="sm" onClick={onClearFilters} icon={<RotateCcw className="w-3.5 h-3.5" />}>
          Reset Active Filters
        </Button>
      )}
    </div>
  );
};
