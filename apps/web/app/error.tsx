"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { JaaliDivider } from "@/components/ui/JaaliDivider";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dharohar Atlas Application Error:", error);
  }, [error]);

  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex items-center justify-center shadow-xl shadow-amber-600/20 text-amber-400">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-serif font-bold text-amber-400 uppercase tracking-widest">
          Service Resilience Boundary
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F6F1E9]">
          Heritage Archive Pipeline Exception
        </h1>
        <p className="text-xs sm:text-sm text-[#D8C3A5] leading-relaxed">
          {error?.message || "An unexpected error occurred while rendering the spatial knowledge layer."}
        </p>
      </div>

      <div className="max-w-xs w-full">
        <JaaliDivider />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          variant="primary"
          onClick={() => reset()}
          className="gap-2 bg-[#D4AF37] text-indigoInk hover:bg-[#F3C649] font-bold text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </Button>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-[#141A26] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Sanctuary</span>
        </Link>
      </div>
    </div>
  );
}
