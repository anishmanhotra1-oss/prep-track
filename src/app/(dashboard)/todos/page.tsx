"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Plus,
  Clock,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  CheckCircle2,
  Edit2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDurationHuman } from "@/lib/utils";

const ROUTINE_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#14B8A6"];

export default function TodosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Today Todo Form
  const [todayTitle, setTodayTitle] = useState("");
  const [todayMins, setTodayMins] = useState("30");

  // Later Todo Form
  const [laterTitle, setLaterTitle] = useState("");

  // Routine Form State
  const [routineName, setRoutineName] = useState("");
  const [routineColor, setRoutineColor] = useState("#F97316");
  const [frequencyType, setFrequencyType] = useState<"interval" | "specific_weekdays" | "weekly">("interval");
  const [intervalDays, setIntervalDays] = useState("1");
  const [routineDuration, setRoutineDuration] = useState("30");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Queries
  const { data: todosData } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error("Failed to load to-dos");
      return res.json();
    },
  });

  const { data: routinesData } = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const res = await fetch("/api/routines");
      return res.ok ? res.json() : { routines: [] };
    },
  });

  const todayTodos = todosData?.todayTodos || [];
  const laterTodos = todosData?.laterTodos || [];
  const totalPlannedMinutesToday = todosData?.totalPlannedMinutesToday || 0;
  const routines = routinesData?.routines || [];

  // Edit Todo State
  const [editingTodo, setEditingTodo] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMins, setEditMins] = useState("");
  const [editBucket, setEditBucket] = useState<"today" | "later">("today");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Todo Mutations
  const addTodoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add to-do");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setTodayTitle("");
      setLaterTitle("");
      toast("To-do item added", "success");
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setIsEditModalOpen(false);
      setEditingTodo(null);
      toast("Task updated successfully", "success");
    },
    onError: (err: any) => toast(err.message, "error"),
  });

  const handleOpenEditTodo = (todo: any) => {
    setEditingTodo(todo);
    setEditTitle(todo.title || "");
    setEditMins(todo.plannedMinutes ? todo.plannedMinutes.toString() : "");
    setEditBucket(todo.bucket || "today");
    setIsEditModalOpen(true);
  };

  const handleSaveEditTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !editTitle.trim()) return;
    const parsedMins = editMins ? parseInt(editMins) : null;
    updateTodoMutation.mutate({
      id: editingTodo.id,
      payload: {
        title: editTitle.trim(),
        plannedMinutes: parsedMins && parsedMins > 0 ? parsedMins : null,
        bucket: editBucket,
      },
    });
  };

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update to-do");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast("To-do updated", "success");
    },
  });

  const moveTodoBucketMutation = useMutation({
    mutationFn: async ({ id, bucket }: { id: string; bucket: "today" | "later" }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket }),
      });
      if (!res.ok) throw new Error("Failed to move to-do");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast("To-do item moved", "info");
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete to-do");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast("To-do deleted", "info");
    },
  });

  // Routine Mutations
  const addRoutineMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add routine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      setRoutineName("");
      toast("Daily routine added", "success");
    },
  });

  const toggleRoutineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/routines/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle routine completion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast("Routine completion toggled", "success");
    },
  });

  const togglePauseRoutineMutation = useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const res = await fetch(`/api/routines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      });
      if (!res.ok) throw new Error("Failed to pause routine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      toast("Routine status updated", "info");
    },
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete routine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      toast("Routine removed", "info");
    },
  });

  const handleAddTodayTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayTitle.trim()) return;
    addTodoMutation.mutate({
      title: todayTitle,
      plannedMinutes: parseInt(todayMins) || 30,
      bucket: "today",
    });
  };

  const handleAddLaterTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laterTitle.trim()) return;
    addTodoMutation.mutate({
      title: laterTitle,
      bucket: "later",
    });
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim()) return;
    addRoutineMutation.mutate({
      name: routineName,
      color: routineColor,
      frequencyType,
      intervalDays: parseInt(intervalDays) || 1,
      weekdays: selectedWeekdays,
      durationMinutes: parseInt(routineDuration) || 30,
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-2">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">To-Dos & Daily Routines</h1>
        <p className="text-xs text-text-muted mt-1">
          Organize today&apos;s tasks, queue items for later, and build habits with daily routines
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Today Card (7 Cols) */}
        <Card className="md:col-span-7 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
              <CheckSquare className="w-4 h-4 text-[#FF9A4D]" />
              <span>Today&apos;s Agenda</span>
            </div>
            <span className="text-xs font-bold text-[#B85A12] bg-[#FFE9D6] px-2.5 py-0.5 rounded-full">
              {formatDurationHuman(totalPlannedMinutesToday * 60)} planned
            </span>
          </div>

          {/* Add Today Todo Input Form */}
          <form onSubmit={handleAddTodayTodo} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="What needs doing today?"
              value={todayTitle}
              onChange={(e) => setTodayTitle(e.target.value)}
              maxLength={120}
              className="flex-1 px-4 py-2 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary focus:outline-none"
            />
            <input
              type="number"
              placeholder="Mins"
              value={todayMins}
              onChange={(e) => setTodayMins(e.target.value)}
              className="w-16 px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary text-center focus:outline-none"
            />
            <Button variant="primary" size="sm" type="submit" disabled={!todayTitle.trim()}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </form>

          {/* Today Tasks List */}
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {todayTodos.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No tasks planned for today. Add one above!
              </p>
            ) : (
              todayTodos.map((todo: any) => {
                const isDone = !!todo.completedAt;
                return (
                  <div
                    key={todo.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isDone
                        ? "bg-orange-50/40 dark:bg-zinc-800/40 border-orange-100/40 line-through opacity-60"
                        : "bg-white/90 dark:bg-zinc-800/90 border-orange-100 dark:border-zinc-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) =>
                          toggleTodoMutation.mutate({ id: todo.id, completed: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#FF9A4D] rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-text-primary">{todo.title}</span>
                        {todo.plannedMinutes && (
                          <span className="ml-2 text-[10px] font-semibold text-[#B85A12] bg-[#FFE9D6] px-2 py-0.5 rounded-full">
                            {todo.plannedMinutes}m
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTodo(todo)}
                        className="p-1 text-text-muted hover:text-[#FF9A4D] rounded"
                        title="Edit task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveTodoBucketMutation.mutate({ id: todo.id, bucket: "later" })}
                        className="p-1 text-text-muted hover:text-[#B85A12] rounded"
                        title="Move to Later"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTodoMutation.mutate(todo.id)}
                        className="p-1 text-text-muted hover:text-red-500 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Later Card (5 Cols) */}
        <Card className="md:col-span-5 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
              <Calendar className="w-4 h-4 text-text-muted" />
              <span>For Later</span>
            </div>
            <span className="text-xs font-bold text-text-muted bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
              {laterTodos.length} items
            </span>
          </div>

          <form onSubmit={handleAddLaterTodo} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Something for another day..."
              value={laterTitle}
              onChange={(e) => setLaterTitle(e.target.value)}
              maxLength={120}
              className="flex-1 px-4 py-2 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary focus:outline-none"
            />
            <Button variant="secondary" size="sm" type="submit" disabled={!laterTitle.trim()}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </form>

          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {laterTodos.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">No backlog items.</p>
            ) : (
              laterTodos.map((todo: any) => {
                const isDone = !!todo.completedAt;
                return (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-orange-100 dark:border-zinc-700 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => moveTodoBucketMutation.mutate({ id: todo.id, bucket: "today" })}
                        className="p-1 text-text-muted hover:text-[#FF9A4D]"
                        title="Move to Today"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="font-semibold text-text-primary">{todo.title}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTodo(todo)}
                        className="p-1 text-text-muted hover:text-[#FF9A4D]"
                        title="Edit task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTodoMutation.mutate(todo.id)}
                        className="p-1 text-text-muted hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Daily Routines Section */}
      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-base text-text-primary">
            <Sparkles className="w-5 h-5 text-[#FF9A4D]" />
            <span>Daily Routines & Habits</span>
          </div>
        </div>

        {/* Add Routine Form */}
        <form
          onSubmit={handleAddRoutine}
          className="p-4 rounded-2xl bg-orange-50/50 dark:bg-zinc-800/40 border border-orange-100 dark:border-zinc-700 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Routine Name (e.g. Morning Vocabulary Review)"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              maxLength={80}
              className="py-2 text-xs flex-1 min-w-[200px]"
            />

            <div className="flex items-center gap-1">
              <span className="text-xs text-text-muted font-medium">Color:</span>
              {ROUTINE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRoutineColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: routineColor === c ? "#2B2118" : "transparent" }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={frequencyType}
                onChange={(e) => setFrequencyType(e.target.value as any)}
                className="px-3 py-2 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200 text-xs text-text-primary"
              >
                <option value="interval">Every N Days</option>
                <option value="specific_weekdays">Specific Weekdays</option>
                <option value="weekly">Weekly</option>
              </select>

              {frequencyType === "interval" && (
                <Input
                  type="number"
                  min={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className="w-16 py-1.5 text-xs text-center"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                label="Duration (mins)"
                type="number"
                min={5}
                value={routineDuration}
                onChange={(e) => setRoutineDuration(e.target.value)}
                className="w-24 py-1.5 text-xs"
              />

              <Button variant="primary" size="sm" type="submit" disabled={!routineName.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Add Routine
              </Button>
            </div>
          </div>
        </form>

        {/* Routines Grid List */}
        {routines.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-orange-200 dark:border-zinc-700 bg-orange-50/30 dark:bg-zinc-800/20 text-xs text-text-muted flex flex-col items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-[#FF9A4D]" />
            <span className="font-bold text-text-primary">No habits or routines created yet</span>
            <p className="max-w-md leading-relaxed">
              Use the form above to add daily study habits (e.g. &quot;Morning Vocabulary Review&quot; or &quot;Daily Practice Problems&quot;). Check them off each day to build your streak!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routines.map((routine: any) => (
              <div
                key={routine.id}
                className="p-4 rounded-2xl glass-card flex flex-col justify-between gap-3 border-l-4 relative"
                style={{ borderLeftColor: routine.color || "#F97316" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleRoutineMutation.mutate(routine.id)}
                      className="text-text-muted hover:text-emerald-500 transition-colors mt-0.5 shrink-0"
                    >
                      <CheckCircle2
                        className={`w-5 h-5 ${routine.isCompletedToday ? "text-emerald-500 fill-emerald-100" : ""}`}
                      />
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-text-primary break-words line-clamp-2" title={routine.name}>
                        {routine.name}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Every {routine.intervalDays ?? 1} day(s) &middot; {routine.durationMinutes ?? 30}m
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        togglePauseRoutineMutation.mutate({ id: routine.id, paused: !routine.pausedAt })
                      }
                      className="p-1 text-text-muted hover:text-text-primary"
                      title={routine.pausedAt ? "Resume" : "Pause"}
                    >
                      {routine.pausedAt ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteRoutineMutation.mutate(routine.id)}
                      className="p-1 text-text-muted hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="pt-2 border-t border-orange-100 dark:border-zinc-800 flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-1 text-orange-600 font-bold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{routine.streak ?? 0} streak</span>
                  </div>
                  <span>
                    {routine.daysDone ?? 0}/{routine.daysScheduled ?? 0} days ({routine.completionPercentage ?? 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Todo Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTodo(null);
        }}
        title="Edit Task"
      >
        <form onSubmit={handleSaveEditTodo} className="flex flex-col gap-4">
          <Input
            label="Task Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            maxLength={120}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Duration (Mins)"
              type="number"
              min={1}
              max={1440}
              placeholder="e.g. 30"
              value={editMins}
              onChange={(e) => setEditMins(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase">Bucket</label>
              <select
                value={editBucket}
                onChange={(e) => setEditBucket(e.target.value as "today" | "later")}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200/60 text-xs text-text-primary focus:outline-none"
              >
                <option value="today">Today's Agenda</option>
                <option value="later">For Later (Backlog)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="md"
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTodo(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={updateTodoMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
