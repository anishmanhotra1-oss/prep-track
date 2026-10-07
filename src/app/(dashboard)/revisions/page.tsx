"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Moon,
  Search,
  CheckSquare,
  AlertCircle,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function RevisionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters & Toggles
  const [statusFilter, setStatusFilter] = useState<"active" | "ignored">("active");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Bulk Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<any>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formSetId, setFormSetId] = useState("");

  // Helper to parse intervals safely
  const parseIntervals = (set: any): number[] => {
    if (!set || !set.intervals) return [1, 7, 30];
    if (Array.isArray(set.intervals)) return set.intervals;
    if (typeof set.intervals === "string") {
      try {
        const arr = JSON.parse(set.intervals);
        if (Array.isArray(arr)) return arr;
      } catch (e) {}
    }
    return [1, 7, 30];
  };

  // Fetch Revisions
  const { data: revisionsData, isLoading } = useQuery({
    queryKey: ["revisions", statusFilter, selectedSubjectId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", statusFilter);
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/revisions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load revisions");
      return res.json();
    },
  });

  // Fetch Subjects
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      return res.ok ? res.json() : { subjects: [] };
    },
  });

  // Fetch Revision Sets
  const { data: revisionSetsData } = useQuery({
    queryKey: ["revision-sets"],
    queryFn: async () => {
      const res = await fetch("/api/revision-sets");
      return res.ok ? res.json() : { revisionSets: [] };
    },
  });

  const topics = revisionsData?.topics || [];
  const stats = revisionsData?.stats || {
    topicsTracked: 0,
    dueTodayCount: 0,
    overdueCount: 0,
    next7DaysCount: 0,
    doneThisMonthCount: 0,
  };
  const subjects = subjectsData?.subjects || [];
  const revisionSets = revisionSetsData?.revisionSets || [];

  // Mutations
  const createTopicMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create revision topic");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      setIsCreateModalOpen(false);
      setFormTitle("");
      toast("Revision topic created", "success");
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/revisions/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete revision step");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      toast(
        data.topic.status === "mastered"
          ? "🎉 Topic Mastered! Outstanding job!"
          : "Step completed! Scheduled next revision.",
        "success"
      );
    },
  });

  const snoozeTopicMutation = useMutation({
    mutationFn: async ({ id, days, action }: { id: string; days: number; action?: string }) => {
      const res = await fetch(`/api/revisions/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, action }),
      });
      if (!res.ok) throw new Error("Failed to snooze revision");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      setIsSnoozeModalOpen(false);
      toast("Revision snoozed", "info");
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/revisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update revision topic");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      setIsEditModalOpen(false);
      toast("Revision topic updated", "success");
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/revisions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete revision");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      toast("Revision topic deleted", "info");
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/revisions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed bulk operation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      setSelectedIds([]);
      toast("Bulk operation complete", "success");
    },
  });

  const handleOpenCreate = () => {
    setFormTitle("");
    setFormSubjectId(subjects[0]?.id || "");
    setFormSetId(revisionSets[0]?.id || "");
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (topic: any) => {
    setActiveTopic(topic);
    setFormTitle(topic.title);
    setFormSubjectId(topic.subjectId || "");
    setFormSetId(topic.setId);
    setIsEditModalOpen(true);
  };

  const handleStartTimerForTopic = (topic: any) => {
    router.push(`/stopwatch?topic=${encodeURIComponent(topic.title)}&subjectId=${topic.subjectId || ""}`);
  };

  // Chronological Grouping for Roadmap
  const groupTopics = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const overdue: any[] = [];
    const today: any[] = [];
    const tomorrow: any[] = [];
    const thisWeek: any[] = [];
    const thisMonth: any[] = [];
    const later: any[] = [];

    topics.forEach((t: any) => {
      const due = new Date(t.nextDueAt);
      if (due < startOfToday) {
        overdue.push(t);
      } else if (due <= endOfToday) {
        today.push(t);
      } else if (due <= endOfTomorrow) {
        tomorrow.push(t);
      } else if (due <= endOfWeek) {
        thisWeek.push(t);
      } else if (due <= endOfMonth) {
        thisMonth.push(t);
      } else {
        later.push(t);
      }
    });

    return [
      { name: "Overdue", items: overdue, isOverdue: true },
      { name: "Today", items: today },
      { name: "Tomorrow", items: tomorrow },
      { name: "This Week", items: thisWeek },
      { name: "This Month", items: thisMonth },
      { name: "Later", items: later },
    ];
  };

  const renderCard = (topic: any, isOverdueSection: boolean = false) => {
    const isSelected = selectedIds.includes(topic.id);
    const intervals = parseIntervals(topic.set);
    const totalSteps = intervals.length;

    const dueObj = new Date(topic.nextDueAt);
    const dueFormatted = dueObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return (
      <div
        key={topic.id}
        className={`p-4 rounded-2xl glass-card transition-all relative border-l-4 flex flex-col justify-between gap-3 ${
          isOverdueSection ? "bg-red-50/40 dark:bg-red-950/20 border-l-red-500" : ""
        }`}
        style={{
          borderLeftColor: !isOverdueSection ? topic.subject?.color || "#FF9A4D" : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {isBulkMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  if (isSelected) setSelectedIds(selectedIds.filter((id) => id !== topic.id));
                  else setSelectedIds([...selectedIds, topic.id]);
                }}
                className="mt-1 accent-[#FF9A4D]"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: topic.subject?.color || "#3B82F6" }}
                >
                  {topic.subject?.name || "General"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-[#B85A12]">
                  {topic.set?.name || "Default"}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-text-primary mt-1.5">{topic.title}</h4>
              <p
                className={`text-xs font-semibold mt-1 ${
                  isOverdueSection ? "text-red-500 font-bold" : "text-text-muted"
                }`}
              >
                {isOverdueSection ? `Overdue · ${dueFormatted}` : `Due: ${dueFormatted}`}
              </p>
            </div>
          </div>

          {/* Action Icon Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => completeStepMutation.mutate(topic.id)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              title="Mark step complete"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStartTimerForTopic(topic)}
              className="p-1.5 text-[#FF9A4D] hover:bg-orange-50 rounded-xl transition-colors"
              title="Start study timer"
            >
              <Clock className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setActiveTopic(topic);
                setIsSnoozeModalOpen(true);
              }}
              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
              title="Snooze"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOpenEdit(topic)}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-xl"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteTopicMutation.mutate(topic.id)}
              className="p-1.5 text-text-muted hover:text-red-500 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Step Dots */}
        <div className="flex items-center justify-between pt-2 border-t border-orange-100/60 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full ${
                  idx < topic.stepIndex ? "bg-emerald-500" : "bg-orange-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase">
            Step {topic.stepIndex + 1} of {totalSteps}
          </span>
        </div>
      </div>
    );
  };

  const roadmaps = groupTopics();

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-2">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Spaced Repetition Revisions</h1>
        <p className="text-xs text-text-muted mt-1">
          Review topics based on spaced repetition intervals (1d &rarr; 7d &rarr; 30d) to maximize retention
        </p>
      </div>

      {/* Five Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-text-muted">Topics Tracked</span>
          <div className="text-xl sm:text-2xl font-extrabold text-text-primary">{stats.topicsTracked}</div>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-text-muted">Due Today</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#FF9A4D]">{stats.dueTodayCount}</div>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase">Overdue</span>
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-red-500">{stats.overdueCount}</div>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-text-muted">Next 7 Days</span>
          <div className="text-xl sm:text-2xl font-extrabold text-text-primary">{stats.next7DaysCount}</div>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90 col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-text-muted">Done This Month</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-500">{stats.doneThisMonthCount}</div>
        </Card>
      </div>

      {/* Toolbar & Filters */}
      <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white/90 dark:bg-zinc-900/90">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-auto flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-orange-50/60 dark:bg-zinc-800 border border-orange-200/60 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Subject Filter */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl bg-orange-50/60 dark:bg-zinc-800 border border-orange-200/60 text-xs font-semibold text-text-primary focus:outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Active / Ignored toggle */}
            <button
              onClick={() => setStatusFilter(statusFilter === "active" ? "ignored" : "active")}
              className="text-xs font-bold text-[#B85A12] bg-[#FFE9D6] px-3 py-2 rounded-2xl hover:bg-orange-200/70 inline-flex items-center gap-1.5 shrink-0"
            >
              {statusFilter === "active" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{statusFilter === "active" ? "Ignored" : "Active"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-orange-100 dark:border-zinc-800">
          <Button
            variant={isBulkMode ? "tint" : "secondary"}
            size="sm"
            onClick={() => setIsBulkMode(!isBulkMode)}
          >
            <CheckSquare className="w-4 h-4 mr-1" /> Bulk Edit
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1" /> New Revision
          </Button>
        </div>
      </Card>

      {/* Bulk Edit Actions Banner if active */}
      {isBulkMode && selectedIds.length > 0 && (
        <Card className="flex items-center justify-between gap-4 bg-[#FFE9D6] border border-orange-300">
          <span className="text-xs font-bold text-[#B85A12]">{selectedIds.length} topics selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkMutation.mutate({ ids: selectedIds, action: "snooze", snoozeDays: 3 })}
            >
              Snooze 3 Days
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkMutation.mutate({ ids: selectedIds, action: "delete" })}
            >
              Delete Selected
            </Button>
          </div>
        </Card>
      )}

      {/* Chronological Roadmap Sections */}
      <div className="flex flex-col gap-8">
        {roadmaps.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.name} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-orange-100 dark:border-zinc-800 pb-2">
                <span
                  className={`text-sm font-extrabold ${
                    group.isOverdue ? "text-red-500" : "text-text-primary"
                  }`}
                >
                  {group.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    group.isOverdue ? "bg-red-100 text-red-600" : "bg-[#FFE9D6] text-[#B85A12]"
                  }`}
                >
                  {group.items.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((topic: any) => renderCard(topic, group.isOverdue))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Revision Topic">
        <div className="flex flex-col gap-4">
          <Input label="Topic Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Subject</label>
            <select
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200 text-xs text-text-primary"
            >
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase">Interval Set</label>
            <select
              value={formSetId}
              onChange={(e) => setFormSetId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 border border-orange-200 text-xs text-text-primary"
            >
              {revisionSets.map((s: any) => {
                const arr = parseIntervals(s);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({arr.join(", ")} days)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!formTitle.trim()}
              onClick={() => createTopicMutation.mutate({ title: formTitle, subjectId: formSubjectId, setId: formSetId })}
            >
              Create Topic
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Revision Topic">
        <div className="flex flex-col gap-4">
          <Input label="Topic Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                updateTopicMutation.mutate({
                  id: activeTopic.id,
                  payload: { title: formTitle, subjectId: formSubjectId, setId: formSetId },
                })
              }
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Snooze Modal */}
      <Modal isOpen={isSnoozeModalOpen} onClose={() => setIsSnoozeModalOpen(false)} title="Snooze Revision">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-muted">Choose when to resume this revision topic:</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="md" onClick={() => snoozeTopicMutation.mutate({ id: activeTopic.id, days: 1 })}>
              Snooze until Tomorrow (1 day)
            </Button>
            <Button variant="secondary" size="md" onClick={() => snoozeTopicMutation.mutate({ id: activeTopic.id, days: 3 })}>
              Snooze for 3 Days
            </Button>
            <Button variant="secondary" size="md" onClick={() => snoozeTopicMutation.mutate({ id: activeTopic.id, days: 7 })}>
              Snooze for 1 Week
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={() => snoozeTopicMutation.mutate({ id: activeTopic.id, days: 1, action: "ignore" })}
            >
              Ignore Topic
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
