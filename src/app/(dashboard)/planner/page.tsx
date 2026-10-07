"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Play,
  CheckCircle2,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Calendar as CalendarIcon,
  Copy,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDurationHuman } from "@/lib/utils";

export default function PlannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View state: 'day' | 'workweek' | 'week'
  const [viewMode, setViewMode] = useState<"day" | "workweek" | "week">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [hourHeight, setHourHeight] = useState<number>(60); // Zoom level 48px -> 96px

  // Live now line state
  const [nowPosition, setNowPosition] = useState<{ top: number; isTodayInView: boolean }>({
    top: 0,
    isTodayInView: false,
  });

  // Modal & Selected Block State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formRecurrence, setFormRecurrence] = useState("none");

  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Calculate Date Window for Query
  const getDaysArray = () => {
    const days: Date[] = [];
    const d = new Date(currentDate);

    if (viewMode === "day") {
      days.push(new Date(d));
    } else if (viewMode === "workweek") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      for (let i = 0; i < 5; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        days.push(nextDay);
      }
    } else {
      // Week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        days.push(nextDay);
      }
    }
    return days;
  };

  const daysList = getDaysArray();
  const startWindowStr = daysList[0]?.toISOString().split("T")[0];
  const endWindowStr = daysList[daysList.length - 1]?.toISOString().split("T")[0];

  // Queries
  const { data: plannerData } = useQuery({
    queryKey: ["planner", startWindowStr, endWindowStr],
    queryFn: async () => {
      const res = await fetch(`/api/planner?start=${startWindowStr}&end=${endWindowStr}`);
      if (!res.ok) throw new Error("Failed to load planner blocks");
      return res.json();
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      return res.ok ? res.json() : { subjects: [] };
    },
  });

  const rawBlocks = plannerData?.blocks || [];
  const routines = plannerData?.routines || [];
  const subjects = subjectsData?.subjects || [];

  // Mutations
  const createBlockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create planner block");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner"] });
      setIsCreateModalOpen(false);
      toast("Planner block created", "success");
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/planner/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update block");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner"] });
      setIsPopoverOpen(false);
      toast("Planner block updated", "success");
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async ({ id, mode, date }: { id: string; mode: string; date?: string }) => {
      const url = `/api/planner/${id}?mode=${mode}${date ? `&date=${date}` : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete block");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner"] });
      setIsPopoverOpen(false);
      toast("Planner block deleted", "info");
    },
  });

  // Calculate Live Red Now Line position
  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();

      // Top position from 06:00 AM start
      const startHour = 6;
      const totalMinsFrom6 = (hours - startHour) * 60 + mins;
      const topPx = (totalMinsFrom6 / 60) * hourHeight;

      const todayStr = now.toISOString().split("T")[0];
      const isTodayInView = daysList.some((d) => d.toISOString().split("T")[0] === todayStr);

      setNowPosition({ top: topPx, isTodayInView });
    };

    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, [currentDate, viewMode, hourHeight]);

  // Auto scroll grid to current time on initial load
  useEffect(() => {
    if (gridScrollRef.current) {
      const now = new Date();
      const currentHour = Math.max(6, now.getHours() - 1);
      const scrollPos = (currentHour - 6) * hourHeight;
      gridScrollRef.current.scrollTop = scrollPos;
    }
  }, []);

  const handlePrev = () => {
    const d = new Date(currentDate);
    const shift = viewMode === "day" ? 1 : viewMode === "workweek" ? 7 : 7;
    d.setDate(d.getDate() - shift);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    const shift = viewMode === "day" ? 1 : viewMode === "workweek" ? 7 : 7;
    d.setDate(d.getDate() + shift);
    setCurrentDate(d);
  };

  const handleSlotClick = (dateObj: Date, hour: number) => {
    const dateStr = dateObj.toISOString().split("T")[0];
    const startHourStr = hour.toString().padStart(2, "0");
    const endHourStr = (hour + 1).toString().padStart(2, "0");

    setFormTitle("");
    setFormSubjectId(subjects[0]?.id || "");
    setFormDate(dateStr);
    setFormStartTime(`${startHourStr}:00`);
    setFormEndTime(`${endHourStr}:00`);
    setFormRecurrence("none");
    setIsCreateModalOpen(true);
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const startAt = `${formDate}T${formStartTime}:00.000Z`;
    const endAt = `${formDate}T${formEndTime}:00.000Z`;

    createBlockMutation.mutate({
      title: formTitle,
      subjectId: formSubjectId || null,
      startAt,
      endAt,
      recurrence: formRecurrence !== "none" ? { frequency: formRecurrence } : null,
    });
  };

  const handleStartStopwatchFromBlock = (block: any) => {
    const durationSeconds = Math.max(300, Math.floor((new Date(block.endAt).getTime() - new Date(block.startAt).getTime()) / 1000));
    const targetMins = Math.round(durationSeconds / 60);

    router.push(
      `/stopwatch?topic=${encodeURIComponent(block.title)}&subjectId=${block.subjectId || ""}&targetMinutes=${targetMins}`
    );
  };

  const hoursArray = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto py-2">
      {/* Header Toolbar */}
      <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white/90 dark:bg-zinc-900/90">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>

          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-orange-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNext} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-orange-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs sm:text-sm font-extrabold text-text-primary truncate">
            {daysList[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} &ndash;{" "}
            {daysList[daysList.length - 1]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {/* View Mode Segmented Control & Zoom */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-orange-100 dark:border-zinc-800">
          <div className="flex items-center bg-orange-50 dark:bg-zinc-800 p-1 rounded-2xl border border-orange-200">
            {(["day", "workweek", "week"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-xl capitalize transition-all ${
                  viewMode === m ? "bg-[#FF9A4D] text-white shadow-sm" : "text-text-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setHourHeight(Math.max(40, hourHeight - 10))}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHourHeight(Math.min(100, hourHeight + 10))}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const todayStr = new Date().toISOString().split("T")[0];
              setFormTitle("");
              setFormDate(todayStr);
              setFormStartTime("09:00");
              setFormEndTime("10:00");
              setIsCreateModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> New Block
          </Button>
        </div>
      </Card>

      {/* Grid Container with Horizontal Scroll support for multi-day view */}
      <Card className="p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 shadow-card relative">
        <div className="overflow-x-auto touch-pan-x w-full">
          <div className={viewMode !== "day" ? "min-w-[640px]" : "w-full"}>
            {/* Sticky Days Header */}
            <div
              className="grid border-b border-orange-100 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95 z-20"
              style={{ gridTemplateColumns: `60px repeat(${daysList.length}, minmax(0, 1fr))` }}
            >
              <div className="p-3 text-center border-r border-orange-100 dark:border-zinc-800 text-[10px] font-bold text-text-muted uppercase">
                Time
              </div>
              {daysList.map((dayObj) => {
                const dateStr = dayObj.toISOString().split("T")[0];
                const isToday = dateStr === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={dateStr}
                    className={`p-3 text-center border-r border-orange-100 dark:border-zinc-800 ${
                      isToday ? "bg-orange-50/50 dark:bg-zinc-800/40" : ""
                    }`}
                  >
                    <span className="text-[11px] font-bold text-text-muted uppercase block">
                      {dayObj.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <div className="flex items-center justify-center mt-1">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                          isToday ? "bg-[#FF9A4D] text-white shadow-md shadow-orange-500/30" : "text-text-primary"
                        }`}
                      >
                        {dayObj.getDate()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable Time Grid */}
            <div ref={gridScrollRef} className="max-h-[640px] overflow-y-auto relative">
              <div
                className="grid relative"
                style={{
                  gridTemplateColumns: `60px repeat(${daysList.length}, minmax(0, 1fr))`,
                  height: `${hoursArray.length * hourHeight}px`,
                }}
              >
                {/* Left Time Gutter */}
                <div className="border-r border-orange-100 dark:border-zinc-800 flex flex-col">
                  {hoursArray.map((hour) => (
                    <div
                      key={hour}
                      className="text-[10px] font-bold text-text-muted text-center pt-1 border-b border-orange-50 dark:border-zinc-800/50"
                      style={{ height: `${hourHeight}px` }}
                    >
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

              {/* Day Columns */}
            {daysList.map((dayObj) => {
              const dateStr = dayObj.toISOString().split("T")[0];
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              // Filter blocks belonging to this day
              const dayBlocks = rawBlocks.filter((b: any) => {
                const bStartStr = new Date(b.startAt).toISOString().split("T")[0];
                return bStartStr === dateStr;
              });

              return (
                <div
                  key={dateStr}
                  className={`border-r border-orange-100 dark:border-zinc-800 relative ${
                    isToday ? "bg-orange-50/20 dark:bg-zinc-800/20" : ""
                  }`}
                >
                  {/* Hour slots */}
                  {hoursArray.map((hour) => (
                    <div
                      key={hour}
                      onClick={() => handleSlotClick(dayObj, hour)}
                      className="border-b border-orange-50 dark:border-zinc-800/50 hover:bg-orange-100/30 cursor-pointer transition-colors"
                      style={{ height: `${hourHeight}px` }}
                    />
                  ))}

                  {/* Render Day Blocks */}
                  {dayBlocks.map((block: any) => {
                    const startObj = new Date(block.startAt);
                    const endObj = new Date(block.endAt);

                    const startHour = startObj.getHours() + startObj.getMinutes() / 60;
                    const endHour = endObj.getHours() + endObj.getMinutes() / 60;

                    const topPx = (startHour - 6) * hourHeight;
                    const heightPx = Math.max(30, (endHour - startHour) * hourHeight);

                    const isDone = !!block.doneAt;

                    return (
                      <div
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBlock(block);
                          setIsPopoverOpen(true);
                        }}
                        className={`absolute left-1 right-1 p-2 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between overflow-hidden ${
                          isDone ? "opacity-60 line-through" : ""
                        }`}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          backgroundColor: `${block.subject?.color || "#FF9A4D"}18`,
                          borderLeftColor: block.subject?.color || "#FF9A4D",
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-text-primary truncate">
                              {block.title}
                            </span>
                            {block.recurrence && <RotateCcw className="w-3 h-3 text-[#FF9A4D]" />}
                          </div>
                          <p className="text-[10px] text-text-muted font-mono mt-0.5">
                            {startObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                            {endObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Red Live Now Line */}
                  {isToday && nowPosition.top > 0 && (
                    <div
                      className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                      style={{ top: `${nowPosition.top}px` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 shadow-md" />
                      <div className="h-[2px] bg-red-500 flex-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </Card>

      {/* Block Popover Action Modal */}
      <Modal
        isOpen={isPopoverOpen && !!selectedBlock}
        onClose={() => setIsPopoverOpen(false)}
        title={selectedBlock?.title || "Planner Event"}
      >
        {selectedBlock && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-orange-50/50 dark:bg-zinc-800/40 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedBlock.subject?.color || "#FF9A4D" }}
                />
                <span className="font-bold text-text-primary">{selectedBlock.subject?.name || "General"}</span>
              </div>
              <p className="text-text-muted mt-1">
                {new Date(selectedBlock.startAt).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                &ndash; {new Date(selectedBlock.endAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsPopoverOpen(false);
                  handleStartStopwatchFromBlock(selectedBlock);
                }}
              >
                <Play className="w-4 h-4 mr-1" /> Start Timer
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateBlockMutation.mutate({
                    id: selectedBlock.id,
                    payload: { doneAt: new Date().toISOString(), logStudySession: true },
                  })
                }
              >
                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Done & Log
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-orange-100 dark:border-zinc-800 pt-3">
              <button
                onClick={() => deleteBlockMutation.mutate({ id: selectedBlock.id, mode: "this_day" })}
                className="text-xs font-semibold text-text-muted hover:text-red-500"
              >
                Delete This Day
              </button>

              <button
                onClick={() => deleteBlockMutation.mutate({ id: selectedBlock.id, mode: "series" })}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Delete Series
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Block Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Planner Block">
        <form onSubmit={handleSaveBlock} className="flex flex-col gap-4">
          <Input label="Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Subject</label>
            <select
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200 text-xs text-text-primary"
            >
              <option value="">General</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Input label="Date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} required />
            <Input label="End Time" type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Recurrence</label>
            <select
              value={formRecurrence}
              onChange={(e) => setFormRecurrence(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200 text-xs text-text-primary"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={!formTitle.trim()}>
              Save Block
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
