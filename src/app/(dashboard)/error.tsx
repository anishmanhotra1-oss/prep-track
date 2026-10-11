"use client";

import React, { useEffect } from "react";
import { RotateCcw, AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4 py-12">
      <div className="w-14 h-14 rounded-3xl bg-orange-100 text-[#B85A12] flex items-center justify-center mb-5 shadow-sm">
        <AlertTriangle className="w-7 h-7 text-[#FF9A4D]" />
      </div>

      <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
        Temporary Connection Delay
      </h2>
      <p className="text-xs text-text-muted mt-2 leading-relaxed">
        We encountered a brief delay connecting to the database on first load. Clicking retry will reload your data immediately.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <Button variant="primary" size="md" onClick={() => reset()} className="rounded-full px-6">
          <RotateCcw className="w-4 h-4 mr-1.5" /> Try Again
        </Button>

        <Link href="/stopwatch">
          <Button variant="secondary" size="md" className="rounded-full px-5">
            <Home className="w-4 h-4 mr-1.5" /> Stopwatch
          </Button>
        </Link>
      </div>
    </div>
  );
}
