"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Timer, Play, Pause, Square, X, ChevronLeft } from "lucide-react";
import { useTimerStore } from "@/store/useTimerStore";
import { formatSeconds } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

export const FloatingTimerDrawer: React.FC = () => {
  const pathname = usePathname();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeTimer, isMiniDrawerOpen, toggleMiniDrawer, setMiniDrawerOpen, setActiveTimer, getElapsedSeconds } =
    useTimerStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Hide tab on main stopwatch page
  const isStopwatchPage = pathname === "/stopwatch";

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

  if (isStopwatchPage) return null;

  const handleStartPause = async () => {
    try {
      const action = activeTimer.status === "running" ? "pause" : "start";
      const res = await fetch(`/api/timer/${action}`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setActiveTimer(updated.activeTimer);
        toast(action === "start" ? "Timer resumed" : "Timer paused", "info");
      }
    } catch (e) {
      toast("Failed to update timer", "error");
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch("/api/timer/stop", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setActiveTimer(json.activeTimer || { status: "idle", accumulatedMs: 0, revise: false, laps: [] });
        queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
        toast("Session saved!", "success");
        setMiniDrawerOpen(false);
      }
    } catch (e) {
      toast("Failed to stop timer", "error");
    }
  };

  return (
    <>
      {/* Fixed Vertical Orange Tab on Right Edge */}
      {!isMiniDrawerOpen && (
        <button
          onClick={toggleMiniDrawer}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#FF9A4D] hover:bg-[#FF8A33] text-white px-2 py-4 rounded-l-2xl shadow-xl flex flex-col items-center gap-2 font-bold text-xs tracking-wider uppercase transition-all duration-200 hover:-translate-x-1"
          style={{ writingMode: "vertical-rl" }}
        >
          <div className="flex items-center gap-1">
            <Timer className="w-4 h-4 rotate-90" />
            <span>TIMER ({formatSeconds(elapsedSeconds)})</span>
          </div>
        </button>
      )}

      {/* Slide-in Mini Drawer */}
      {isMiniDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-sm sm:w-96 glass-card p-4 sm:p-6 bg-white/95 dark:bg-zinc-900/95 shadow-2xl border-l border-orange-200/50 dark:border-zinc-700 flex flex-col justify-between animate-slide-left rounded-l-3xl">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-text-primary font-bold">
                <Timer className="w-5 h-5 text-[#FF9A4D]" />
                <span>Mini Timer</span>
              </div>
              <button
                onClick={() => setMiniDrawerOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-orange-100/50 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Session Info */}
            <div className="flex flex-col items-center gap-4 text-center py-4 bg-orange-50/50 dark:bg-zinc-800/50 rounded-3xl border border-orange-100 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeTimer.subjectColor || "#FF9A4D" }}
                />
                <span className="text-sm font-semibold text-text-primary">
                  {activeTimer.subjectName || "General Study"}
                </span>
              </div>

              <p className="text-xs text-text-muted max-w-xs line-clamp-2">
                {activeTimer.topic || "No topic specified"}
              </p>

              <div className="text-4xl font-extrabold tabular-timer text-[#FF9A4D] font-mono tracking-tight my-2">
                {formatSeconds(elapsedSeconds)}
              </div>

              <div className="capitalize text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-zinc-700 text-text-muted shadow-sm">
                Status: {activeTimer.status}
              </div>
            </div>

            {/* Timer Quick Actions */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={activeTimer.status === "running" ? "secondary" : "primary"}
                size="md"
                onClick={handleStartPause}
                className="flex-1"
              >
                {activeTimer.status === "running" ? (
                  <>
                    <Pause className="w-4 h-4 mr-1" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" /> Resume
                  </>
                )}
              </Button>

              <Button
                variant="destructive"
                size="md"
                onClick={handleStop}
                disabled={activeTimer.status === "idle" && elapsedSeconds === 0}
              >
                <Square className="w-4 h-4 mr-1 fill-current" /> Stop
              </Button>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-orange-100 dark:border-zinc-800">
            <button
              onClick={() => setMiniDrawerOpen(false)}
              className="text-xs font-semibold text-text-muted hover:text-[#B85A12] inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Close drawer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
