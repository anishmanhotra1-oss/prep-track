"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      queryClient.invalidateQueries();
    };

    if (typeof window !== "undefined") {
      if (!navigator.onLine) setIsOffline(true);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [queryClient]);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-slide-down">
      <WifiOff className="w-4 h-4" />
      <span>You are offline. Changes will sync automatically when your connection is restored.</span>
      <button
        onClick={() => queryClient.invalidateQueries()}
        className="ml-2 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 flex items-center gap-1 text-[11px]"
      >
        <RefreshCw className="w-3 h-3" /> Retry Sync
      </button>
    </div>
  );
}
