"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Moon,
  FileText,
  Clock,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Tag,
  Flag,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDurationHuman, formatSeconds } from "@/lib/utils";

export default function HistoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [dayNoteInput, setDayNoteInput] = useState("");

  // Session Form State
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:30");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState("");
  const [formNote, setFormNote] = useState("");

  // Expandable laps map
  const [expandedLaps, setExpandedLaps] = useState<Record<string, boolean>>({});

  // Queries
  const { data: historyData } = useQuery({
    queryKey: ["history-aggregation"],
    queryFn: async () => {
      const res = await fetch("/api/history?weeks=12");
      return res.ok ? res.json() : { dailyMap: {}, dayLogMap: {} };
    },
  });

  const { data: daySessionsData } = useQuery({
    queryKey: ["day-sessions", selectedDateStr],
    queryFn: async () => {
      const res = await fetch(`/api/sessions?date=${selectedDateStr}`);
      return res.ok ? res.json() : { sessions: [], totalSeconds: 0 };
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      return res.ok ? res.json() : { subjects: [] };
    },
  });

  const { data: dayLogData } = useQuery({
    queryKey: ["day-log", selectedDateStr],
    queryFn: async () => {
      const res = await fetch(`/api/day-log?date=${selectedDateStr}`);
      return res.ok ? res.json() : { dayLog: null };
    },
  });

  const dailyMap = historyData?.dailyMap || {};
  const dayLogMap = historyData?.dayLogMap || {};
  const daySessions = daySessionsData?.sessions || [];
  const dayTotalSeconds = daySessionsData?.totalSeconds || 0;
  const subjects = subjectsData?.subjects || [];
  const currentDayLog = dayLogData?.dayLog || null;

  // Add / Edit Mutations
  const createSessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setIsAddModalOpen(false);
      resetForm();
      toast("Manual session added", "success");
    },
    onError: (err: any) => toast(err.message, "error"),
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setIsEditModalOpen(false);
      resetForm();
      toast("Session updated", "success");
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast("Session deleted", "info");
    },
  });

  const saveDayNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await fetch("/api/day-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDateStr, note }),
      });
      if (!res.ok) throw new Error("Failed to save day note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setIsNoteModalOpen(false);
      toast("Day note updated", "success");
    },
  });

  const toggleRestDayMutation = useMutation({
    mutationFn: async (isRestDay: boolean) => {
      const res = await fetch("/api/day-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDateStr, isRestDay }),
      });
      if (!res.ok) throw new Error("Failed to update rest day");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast("Rest day updated", "info");
    },
  });

  const resetForm = () => {
    setFormSubjectId("");
    setFormTopic("");
    setFormStartTime("09:00");
    setFormEndTime("10:30");
    setFormTags([]);
    setFormTagInput("");
    setFormNote("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (sess: any) => {
    setEditingSession(sess);
    setFormSubjectId(sess.subjectId || "");
    setFormTopic(sess.topic);
    const startObj = new Date(sess.startAt);
    const endObj = new Date(sess.endAt);
    setFormStartTime(startObj.toTimeString().substring(0, 5));
    setFormEndTime(endObj.toTimeString().substring(0, 5));
    setFormTags(sess.tags || []);
    setFormNote(sess.note || "");
    setIsEditModalOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const startAt = `${selectedDateStr}T${formStartTime}:00.000Z`;
    const endAt = `${selectedDateStr}T${formEndTime}:00.000Z`;

    createSessionMutation.mutate({
      subjectId: formSubjectId || null,
      topic: formTopic,
      startAt,
      endAt,
      tags: formTags,
      note: formNote,
      source: "manual",
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    const startAt = `${selectedDateStr}T${formStartTime}:00.000Z`;
    const endAt = `${selectedDateStr}T${formEndTime}:00.000Z`;

    updateSessionMutation.mutate({
      id: editingSession.id,
      payload: {
        subjectId: formSubjectId || null,
        topic: formTopic,
        startAt,
        endAt,
        tags: formTags,
        note: formNote,
      },
    });
  };

  // Helper for 12-week heatmap grid
  const renderHeatmap = () => {
    const weeksCount = 12;
    const days: Array<{ dateStr: string; mins: number }> = [];
    const today = new Date();

    for (let i = weeksCount * 7 - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push({ dateStr: key, mins: dailyMap[key] || 0 });
    }

    const getIntensityClass = (mins: number) => {
      if (mins === 0) return "bg-[#FFF4EA] dark:bg-zinc-800/60 border border-orange-100/60 dark:border-zinc-700";
      if (mins < 60) return "bg-orange-200 text-orange-900";
      if (mins < 180) return "bg-[#FF9A4D] text-white";
      return "bg-[#B85A12] text-white";
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary">Activity Heatmap (Last 12 Weeks)</span>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-[#FFF4EA] dark:bg-zinc-800 border border-orange-100" />
            <div className="w-3 h-3 rounded-sm bg-orange-200" />
            <div className="w-3 h-3 rounded-sm bg-[#FF9A4D]" />
            <div className="w-3 h-3 rounded-sm bg-[#B85A12]" />
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {days.map((d) => (
            <button
              key={d.dateStr}
              onClick={() => setSelectedDateStr(d.dateStr)}
              className={`w-3.5 h-3.5 rounded-md transition-transform hover:scale-125 ${getIntensityClass(
                d.mins
              )} ${selectedDateStr === d.dateStr ? "ring-2 ring-[#FF9A4D]" : ""}`}
              title={`${d.dateStr}: ${d.mins > 0 ? formatDurationHuman(d.mins * 60) : "No study"}`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Helper for Month Calendar
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekday = firstDay.getDay(); // 0 = Sun
    const totalDays = lastDay.getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = (month + 1).toString().padStart(2, "0");
      const dayStr = day.toString().padStart(2, "0");
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      cells.push({ day, dateKey });
    }

    const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const todayStr = new Date().toISOString().split("T")[0];

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
          <span className="text-sm font-extrabold text-text-primary">{monthName}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-orange-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-orange-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-text-muted mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} className="h-11 sm:h-14" />;

            const mins = dailyMap[cell.dateKey] || 0;
            const log = dayLogMap[cell.dateKey];
            const isSelected = selectedDateStr === cell.dateKey;
            const isToday = todayStr === cell.dateKey;

            return (
              <button
                key={cell.dateKey}
                onClick={() => setSelectedDateStr(cell.dateKey)}
                className={`h-11 sm:h-14 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex flex-col justify-between items-start transition-all relative border ${
                  isSelected
                    ? "bg-[#FFE9D6] border-[#FF9A4D] text-[#B85A12]"
                    : "bg-white/80 dark:bg-zinc-800/80 border-orange-100/60 dark:border-zinc-700 hover:bg-orange-50"
                } ${isToday ? "ring-2 ring-[#FF9A4D]" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] sm:text-xs font-bold">{cell.day}</span>
                  {log?.isRestDay && <Moon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />}
                  {log?.note && <div className="w-1.5 h-1.5 rounded-full bg-[#FF9A4D]" />}
                </div>

                {mins > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-semibold text-text-muted truncate max-w-full">
                    {formatDurationHuman(mins * 60)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-2">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Study History</h1>
        <p className="text-xs text-text-muted mt-1">
          Review your activity heatmap, monthly calendar, and session details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap & Calendar Column */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card>{renderHeatmap()}</Card>
          <Card>{renderCalendar()}</Card>
        </div>

        {/* Selected Day Detail Column */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-text-primary">
                  {new Date(`${selectedDateStr}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {daySessions.length} session{daySessions.length !== 1 ? "s" : ""} &middot;{" "}
                  <strong>{formatDurationHuman(dayTotalSeconds)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                  <Plus className="w-4 h-4 mr-1" /> Add Session
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDayNoteInput(currentDayLog?.note || "");
                    setIsNoteModalOpen(true);
                  }}
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentDayLog?.isRestDay ? "tint" : "ghost"}
                  size="sm"
                  onClick={() => toggleRestDayMutation.mutate(!currentDayLog?.isRestDay)}
                >
                  <Moon className="w-4 h-4 text-amber-500" />
                </Button>
              </div>
            </div>

            {/* Day Note Banner */}
            {currentDayLog?.note && (
              <div className="p-3.5 rounded-2xl bg-[#FFE9D6] dark:bg-[#3D2516] text-[#B85A12] dark:text-[#FFB885] text-xs flex items-start gap-2.5">
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Day Note:</span> {currentDayLog.note}
                </div>
              </div>
            )}

            {/* Session Cards List */}
            <div className="flex flex-col gap-3">
              {daySessions.length === 0 ? (
                <div className="text-center py-10 text-xs text-text-muted glass-card border border-dashed border-orange-200">
                  No study sessions recorded for this day.
                  <div className="mt-3">
                    <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                      <Plus className="w-4 h-4 mr-1" /> Log Manual Session
                    </Button>
                  </div>
                </div>
              ) : (
                daySessions.map((sess: any) => {
                  const startFormatted = new Date(sess.startAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const endFormatted = new Date(sess.endAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const isLapsOpen = !!expandedLaps[sess.id];

                  return (
                    <div
                      key={sess.id}
                      className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-orange-100 dark:border-zinc-700 shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: sess.subject?.color || "#3B82F6" }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                                {sess.subject?.name || "General Study"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-[#B85A12] font-semibold capitalize">
                                {sess.source}
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-text-primary mt-0.5">{sess.topic}</h4>
                            <p className="text-xs text-text-muted mt-1">
                              {startFormatted} &rarr; {endFormatted}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm font-extrabold text-[#FF9A4D] font-mono">
                            {formatDurationHuman(sess.durationSeconds)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(sess)}
                              className="p-1 text-text-muted hover:text-text-primary rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteSessionMutation.mutate(sess.id)}
                              className="p-1 text-text-muted hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tag chips & Note */}
                      {((sess.tags && sess.tags.length > 0) || sess.note) && (
                        <div className="pt-2 border-t border-orange-50 dark:border-zinc-700/50 flex flex-col gap-1.5 text-xs text-text-muted">
                          {sess.tags && sess.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {sess.tags.map((t: string) => (
                                <span key={t} className="px-2 py-0.5 rounded-full bg-orange-50 text-[#B85A12] font-medium text-[10px]">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                          {sess.note && <p className="italic text-text-primary">{sess.note}</p>}
                        </div>
                      )}

                      {/* Expandable Laps */}
                      {sess.laps && sess.laps.length > 0 && (
                        <div className="pt-2">
                          <button
                            onClick={() =>
                              setExpandedLaps({ ...expandedLaps, [sess.id]: !isLapsOpen })
                            }
                            className="text-[11px] font-bold text-[#B85A12] inline-flex items-center gap-1 hover:underline"
                          >
                            <Flag className="w-3 h-3" /> {sess.laps.length} Laps{" "}
                            {isLapsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isLapsOpen && (
                            <div className="mt-2 flex flex-col gap-1 bg-orange-50/50 p-2.5 rounded-xl text-xs font-mono">
                              {sess.laps.map((lap: any) => (
                                <div key={lap.id} className="flex justify-between text-text-muted">
                                  <span>Lap {lap.index}</span>
                                  <span>Split: {formatSeconds(Math.floor(lap.splitMs / 1000))}</span>
                                  <span>Total: {formatSeconds(Math.floor(lap.totalMs / 1000))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Manual Entry & Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? "Edit Study Session" : "Add Manual Study Session"}
      >
        <form onSubmit={isEditModalOpen ? handleSubmitEdit : handleSubmitAdd} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Subject</label>
            <select
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary"
            >
              <option value="">General Study</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Input label="Topic" value={formTopic} onChange={(e) => setFormTopic(e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={formStartTime}
              onChange={(e) => setFormStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Note</label>
            <textarea
              rows={3}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              {isEditModalOpen ? "Update Session" : "Save Session"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Day Note Modal */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Edit Day Note">
        <div className="flex flex-col gap-4">
          <textarea
            rows={4}
            placeholder="Add notes, reflections, or exam milestones for this day..."
            value={dayNoteInput}
            onChange={(e) => setDayNoteInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setIsNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={() => saveDayNoteMutation.mutate(dayNoteInput)}>
              Save Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
