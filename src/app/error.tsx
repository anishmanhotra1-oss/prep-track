"use client";

import React, { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-[#FFF9F5] text-[#2B2118]">
      <div className="w-14 h-14 rounded-3xl bg-orange-100 text-[#B85A12] flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-[#FF9A4D]" />
      </div>

      <h2 className="text-xl font-extrabold tracking-tight">Something unexpected occurred</h2>
      <p className="text-sm font-semibold text-red-600 mt-2 max-w-md bg-red-50 p-3 rounded-2xl border border-red-200 break-words">
        {error?.message && error.message.trim().length > 0
          ? error.message
          : "An error occurred while loading this page."}
      </p>

      {error?.digest && (
        <p className="text-[11px] font-mono text-[#8C7B6E] mt-2">
          Error ID: {error.digest}
        </p>
      )}

      <p className="text-xs text-[#6E5E52] mt-3 max-w-sm leading-relaxed">
        Please try refreshing the page or click below to retry loading the application.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <Button variant="primary" size="md" onClick={() => reset()} className="rounded-full px-6">
          <RotateCcw className="w-4 h-4 mr-1.5" /> Try Again
        </Button>
      </div>
    </div>
  );
}
