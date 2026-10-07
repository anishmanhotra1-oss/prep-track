"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Square,
  Flag,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Moon,
  Sun,
  Plus,
  Tag,
  Clock,
  Volume2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useTimerStore } from "@/store/useTimerStore";
import { formatSeconds, formatDurationHuman } from "@/lib/utils";

export default function StopwatchPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeTimer, setActiveTimer, getElapsedSeconds } = useTimerStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Setup form states
  const [subjectId, setSubjectId] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [revise, setRevise] = useState<boolean>(false);
  const [targetMinutes, setTargetMinutes] = useState<string>("");

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [saveNote, setSaveNote] = useState("");

  // Section collapse states
  const [isReviseOpen, setIsReviseOpen] = useState(true);
  const [isRoutinesOpen, setIsRoutinesOpen] = useState(true);

  // Synchronize local timer display ticker every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

  // Sync inputs with active timer state if running
  useEffect(() => {
    if (activeTimer.subjectId) setSubjectId(activeTimer.subjectId);
    if (activeTimer.topic) setTopic(activeTimer.topic);
    if (activeTimer.revise !== undefined) setRevise(activeTimer.revise);
    if (activeTimer.targetSeconds) setTargetMinutes(Math.round(activeTimer.targetSeconds / 60).toString());
  }, [activeTimer.id]);

  // Queries
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      return res.ok ? res.json() : { subjects: [] };
    },
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.ok ? res.json() : { profile: {} };
    },
  });

  const { data: revisionsData } = useQuery({
    queryKey: ["revisions"],
    queryFn: async () => {
      const res = await fetch("/api/revisions?status=active");
      return res.ok ? res.json() : { topics: [] };
    },
  });

  const { data: dayLogData } = useQuery({
    queryKey: ["day-log-today"],
    queryFn: async () => {
      const res = await fetch("/api/day-log");
      return res.ok ? res.json() : { dayLog: null };
    },
  });

  const { data: todaySessionsData } = useQuery({
    queryKey: ["today-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions?range=today");
      return res.ok ? res.json() : { sessions: [], totalSeconds: 0 };
    },
  });

  const subjects = subjectsData?.subjects || [];
  const dueRevisions = revisionsData?.topics || [];
  const todayStudiedSeconds = todaySessionsData?.totalSeconds || 0;
  const dailyGoalMinutes = settingsData?.profile?.dailyGoalMinutes || 240;
  const isRestDay = dayLogData?.dayLog?.isRestDay || false;

  // Timer Target calculations
  const targetSec = activeTimer.targetSeconds || (targetMinutes ? parseInt(targetMinutes) * 60 : 0);
  const isCountdown = targetSec > 0;
  const remainingSec = Math.max(0, targetSec - elapsedSeconds);
  const displaySec = isCountdown ? remainingSec : elapsedSeconds;
  const progressPercent = targetSec > 0 ? Math.min(100, (elapsedSeconds / targetSec) * 100) : 0;

  // Handlers
  const handleStartPause = async () => {
    try {
      const action = activeTimer.status === "running" ? "pause" : "start";
      const targetSecParsed = targetMinutes ? parseInt(targetMinutes) * 60 : null;

      const res = await fetch(`/api/timer/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectId || null,
          topic: topic || null,
          targetSeconds: targetSecParsed,
          revise,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setActiveTimer(json.activeTimer);
        toast(action === "start" ? "Session started!" : "Timer paused", "info");
      }
    } catch (err) {
      toast("Error starting timer", "error");
    }
  };

  const handleLap = async () => {
    try {
      const res = await fetch("/api/timer/lap", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setActiveTimer(json.activeTimer);
        toast("Lap recorded", "info");
      }
    } catch (e) {
      toast("Failed to record lap", "error");
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch("/api/timer/reset", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setActiveTimer(json.activeTimer);
        setElapsedSeconds(0);
        toast("Timer reset to 00:00:00", "info");
      }
    } catch (e) {
      toast("Failed to reset timer", "error");
    }
  };

  const handleOpenStopModal = () => {
    setIsSaveModalOpen(true);
  };

  const handleSaveSession = async () => {
    try {
      const res = await fetch("/api/timer/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectId || null,
          topic: topic || "Focus Session",
          tags: saveTags,
          note: saveNote,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setActiveTimer(json.activeTimer);
        setIsSaveModalOpen(false);
        queryClient.invalidateQueries();
        toast("Study session saved successfully!", "success");
      }
    } catch (e) {
      toast("Failed to save session", "error");
    }
  };

  const toggleRestDay = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await fetch("/api/day-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, isRestDay: !isRestDay }),
      });
      queryClient.invalidateQueries({ queryKey: ["day-log-today"] });
      toast(!isRestDay ? "Today marked as Rest Day 🌙" : "Rest day unmarked", "info");
    } catch (e) {
      toast("Failed to update rest day", "error");
    }
  };

  const handleCompleteRevisionStep = async (topicId: string) => {
    try {
      const res = await fetch(`/api/revisions/${topicId}/complete`, { method: "POST" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["revisions"] });
        toast("Revision step completed!", "success");
      }
    } catch (e) {
      toast("Failed to complete revision", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1360px] mx-auto px-2 sm:px-4 py-2">
      {/* Today Bar */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/90 dark:bg-zinc-900/90 border border-orange-200/50 p-4 sm:p-5">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-2xl bg-[#FFE9D6] text-[#B85A12] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-text-muted font-medium">
              Today &middot; <strong className="text-text-primary">{formatDurationHuman(todayStudiedSeconds)}</strong> studied &middot; Goal: {Math.round(dailyGoalMinutes / 60)}h
            </div>
            {/* Progress bar */}
            <div className="w-full sm:w-64 h-2 bg-orange-100 dark:bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-[#FF9A4D] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (todayStudiedSeconds / (dailyGoalMinutes * 60)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant={isRestDay ? "tint" : "secondary"}
            size="sm"
            onClick={toggleRestDay}
          >
            <Moon className="w-4 h-4 mr-1 text-amber-500" />
            {isRestDay ? "Rest Day Active" : "Rest Day"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries();
              toast("Day status synced", "info");
            }}
          >
            New Day
          </Button>
        </div>
      </Card>

      {/* Main Responsive Grid Layout utilizing side empty spaces */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Main Column: Timer Dial & Controls + Session Setup */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          {/* Main Stopwatch Circular Dial Card */}
          <Card className="flex flex-col items-center justify-center p-5 sm:p-8 md:p-12 relative overflow-hidden bg-white/95 dark:bg-zinc-900/95 shadow-card min-h-[340px] sm:min-h-[380px]">
            {/* Progress Ring & Digits */}
            <div className="relative w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 flex flex-col items-center justify-center my-2">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="text-orange-100 dark:text-zinc-800 stroke-current"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="text-[#FF9A4D] stroke-current transition-all duration-500 ease-out"
                  strokeWidth="5"
                  strokeDasharray={276}
                  strokeDashoffset={276 - (276 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Central Digits & Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-muted mb-1">
                  {activeTimer.status === "idle"
                    ? "Ready to Focus"
                    : isCountdown
                    ? "Time Left"
                    : "Studying"}
                </span>
                <div className="text-4xl sm:text-5xl md:text-6xl font-extrabold tabular-timer text-text-primary tracking-tight font-mono">
                  {formatSeconds(displaySec)}
                </div>
              </div>
            </div>

            {/* Timer Control Buttons - Perfectly Centered Layout */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 w-full max-w-2xl">
              {/* Left Secondary Controls: Reset & Lap */}
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleReset}
                  disabled={activeTimer.status === "idle" && elapsedSeconds === 0}
                  title="Reset timer"
                  className="rounded-full px-4 text-xs font-bold hover:bg-orange-100/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLap}
                  disabled={activeTimer.status === "idle"}
                  title="Record lap"
                  className="rounded-full px-4 text-xs font-bold border-orange-200/70 dark:border-zinc-700"
                >
                  <Flag className="w-4 h-4 mr-1.5" /> Lap
                </Button>
              </div>

              {/* Main Center Primary Action Button */}
              <div className="order-1 sm:order-2 shrink-0">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartPause}
                  className="px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-black rounded-full bg-gradient-to-r from-[#FF8A33] via-[#FF9A4D] to-[#E56B10] text-white shadow-xl shadow-orange-500/35 hover:shadow-orange-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 min-w-[210px] sm:min-w-[240px]"
                >
                  {activeTimer.status === "running" ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" /> Pause Session
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" /> {activeTimer.status === "paused" ? "Resume Session" : "Start Focus Session"}
                    </>
                  )}
                </Button>
              </div>

              {/* Right Control: Stop */}
              <div className="flex items-center gap-2 order-3 sm:order-3">
                <Button
                  variant="destructive"
                  size="md"
                  onClick={handleOpenStopModal}
                  disabled={activeTimer.status === "idle" && elapsedSeconds === 0}
                  title="Stop and save session"
                  className="rounded-full px-5 text-xs font-bold shadow-md"
                >
                  <Square className="w-4 h-4 mr-1.5 fill-current" /> Stop
                </Button>
              </div>
            </div>
          </Card>

          {/* Session Setup Bar */}
          <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white/90 dark:bg-zinc-900/90">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Subject Dropdown */}
              <div className="relative w-full sm:w-auto">
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl bg-orange-50/60 dark:bg-zinc-800 border border-orange-200/60 dark:border-zinc-700 text-xs font-semibold text-text-primary focus:outline-none"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Input */}
              <input
                type="text"
                placeholder="What are you studying today?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-[#FF9A4D]"
              />

              {/* Revise Checkbox */}
              <label className="flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold text-[#B85A12] bg-[#FFE9D6] px-3.5 py-2.5 rounded-2xl hover:bg-orange-200/60 transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={revise}
                  onChange={(e) => setRevise(e.target.checked)}
                  className="rounded accent-[#FF9A4D]"
                />
                <span>Revise</span>
              </label>
            </div>

            {/* Target Minutes & Preset Quick Picks */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-orange-100 dark:border-zinc-800">
              <input
                type="number"
                placeholder="Mins"
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(e.target.value)}
                className="w-16 px-3 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary text-center focus:outline-none"
              />

              <div className="flex items-center gap-1">
                {[25, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTargetMinutes(m.toString())}
                    className="px-2.5 py-2 text-[11px] font-bold rounded-xl bg-orange-100/50 hover:bg-[#FF9A4D] hover:text-white text-text-muted transition-colors"
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side Column: Side empty space utilized for Revise Now & Today's Overview */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Revise Now Section */}
          <Card className="flex flex-col gap-4 p-5">
            <div
              onClick={() => setIsReviseOpen(!isReviseOpen)}
              className="flex items-center justify-between cursor-pointer border-b border-orange-100 dark:border-zinc-800 pb-3"
            >
              <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
                <RotateCcw className="w-4 h-4 text-[#FF9A4D]" />
                <span>Revise Now</span>
                <span className="text-xs bg-[#FFE9D6] text-[#B85A12] px-2.5 py-0.5 rounded-full font-bold">
                  {dueRevisions.length}
                </span>
              </div>
              <button className="text-text-muted">
                {isReviseOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isReviseOpen && (
              <div className="flex flex-col gap-2.5">
                {dueRevisions.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">No revisions due today. Great job!</p>
                ) : (
                  dueRevisions.slice(0, 6).map((rev: any) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-orange-100 dark:border-zinc-700 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <button
                          onClick={() => handleCompleteRevisionStep(rev.id)}
                          className="text-text-muted hover:text-emerald-500 transition-colors shrink-0"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-text-primary truncate block">{rev.title}</span>
                          <p className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0 inline-block"
                              style={{ backgroundColor: rev.subject?.color || "#3B82F6" }}
                            />
                            <span className="truncate">{rev.subject?.name || "General"}</span> &middot; Step {rev.stepIndex + 1}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="tint"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setTopic(rev.title);
                          if (rev.subjectId) setSubjectId(rev.subjectId);
                          toast(`Prefilled timer with topic: ${rev.title}`, "info");
                        }}
                      >
                        Study
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Today's Study Sessions Log Preview Card */}
          <Card className="flex flex-col gap-3 p-5 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 dark:from-zinc-900 dark:to-zinc-900 border border-orange-200/50">
            <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF9A4D]" />
                Today's Sessions ({todaySessionsData?.sessions?.length || 0})
              </span>
              <span className="text-xs font-bold text-[#B85A12]">
                {formatDurationHuman(todayStudiedSeconds)}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {(!todaySessionsData?.sessions || todaySessionsData.sessions.length === 0) ? (
                <p className="text-xs text-text-muted py-3 text-center">No sessions recorded yet today.</p>
              ) : (
                todaySessionsData.sessions.map((sess: any) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-orange-100/60 dark:border-zinc-700 text-xs"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-text-primary truncate">{sess.topic || "Focus Session"}</span>
                      <span className="text-[10px] text-text-muted truncate">
                        {sess.subject?.name || "General"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#FF9A4D] shrink-0">
                      {formatDurationHuman(sess.durationSeconds)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Save Session Modal */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Study Session">
        <div className="flex flex-col gap-4">
          <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {saveTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-[#B85A12] flex items-center gap-1"
                >
                  #{tag}
                  <button onClick={() => setSaveTags(saveTags.filter((t) => t !== tag))}>&times;</button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Add tag (Enter)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagInput.trim()) {
                    e.preventDefault();
                    setSaveTags([...saveTags, newTagInput.trim().toLowerCase()]);
                    setNewTagInput("");
                  }
                }}
                className="px-2 py-1 text-xs rounded-xl bg-orange-50 dark:bg-zinc-800 border border-orange-200 outline-none"
              />
            </div>
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Notes / Takeaways</label>
            <textarea
              rows={3}
              placeholder="What did you learn during this session?"
              value={saveNote}
              onChange={(e) => setSaveNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsSaveModalOpen(false)}>
              Discard
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveSession}>
              Save Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
