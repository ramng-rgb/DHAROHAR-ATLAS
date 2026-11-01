import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Archives Temporarily Unreachable",
  message = "Could not synchronize with the geospatial database. Please verify your connection or retry.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center p-6 border border-terracotta/40 rounded-xl bg-terracotta/10 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta-light mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="font-serif font-bold text-parchment-100 mb-1">{title}</h4>
      <p className="text-xs text-sandstone max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="terracotta" size="sm" onClick={onRetry} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Connection
        </Button>
      )}
    </div>
  );
};
