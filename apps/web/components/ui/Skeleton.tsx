import React from "react";

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "h-4 w-full" }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-parchment-900/60 via-sandstone/15 to-parchment-900/60 rounded ${className}`}
    />
  );
};
