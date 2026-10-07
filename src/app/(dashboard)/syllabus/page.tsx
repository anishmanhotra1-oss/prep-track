"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Calendar,
  RotateCcw,
  Check,
  Edit2,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function SyllabusPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState("");

  const [cellSavings, setCellSavings] = useState<Record<string, boolean>>({});

  // Fetch Syllabus Data
  const { data: syllabusData } = useQuery({
    queryKey: ["syllabus"],
    queryFn: async () => {
      const res = await fetch("/api/syllabus");
      if (!res.ok) throw new Error("Failed to load syllabus");
      return res.json();
    },
  });

  const subjects = syllabusData?.syllabusSubjects || [];

  // Mutations
  const addSubjectMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/syllabus/subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create subject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      setIsAddSubjectModalOpen(false);
      setNewSubjectTitle("");
      toast("Syllabus subject created with default columns", "success");
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/syllabus/subject/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to update subject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      toast("Subject title updated", "success");
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/syllabus/subject/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      toast("Subject deleted", "info");
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: async ({ subjectId, name, type }: { subjectId: string; name: string; type: string }) => {
      const res = await fetch("/api/syllabus/column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, name, type }),
      });
      if (!res.ok) throw new Error("Failed to add column");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      toast("Column added", "success");
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/syllabus/column/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete column");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      toast("Column removed", "info");
    },
  });

  const addRowMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      const res = await fetch("/api/syllabus/row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      if (!res.ok) throw new Error("Failed to add row");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      toast("Row added", "success");
    },
  });

  const toggleRowDoneMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const res = await fetch(`/api/syllabus/row/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error("Failed to update row status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/syllabus/row/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete row");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      toast("Row deleted", "info");
    },
  });

  // Cell Save Debounced
  const saveCell = useCallback(
    async (rowId: string, columnId: string, value: string) => {
      const key = `${rowId}_${columnId}`;
      setCellSavings((prev) => ({ ...prev, [key]: true }));
      try {
        await fetch("/api/syllabus/cell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId, columnId, value }),
        });
      } catch (e) {
        // silent fail
      } finally {
        setTimeout(() => {
          setCellSavings((prev) => ({ ...prev, [key]: false }));
        }, 1000);
      }
    },
    []
  );

  const handleAddToRevision = async (topicTitle: string) => {
    try {
      // Find default revision set
      const setsRes = await fetch("/api/revision-sets");
      const setsData = await setsRes.json();
      const defaultSet = setsData.revisionSets?.[0];

      if (!defaultSet) {
        toast("Please create a revision set first in Settings", "error");
        return;
      }

      await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topicTitle || "Syllabus Topic",
          setId: defaultSet.id,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["revisions"] });
      toast(`Added "${topicTitle}" to Spaced Repetition Revisions!`, "success");
    } catch (e) {
      toast("Failed to add to revisions", "error");
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Syllabus Tracker</h1>
          <p className="text-xs text-text-muted mt-1">
            Track subject topics, target completion dates, sources, and sync items into revisions
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsAddSubjectModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Subject Card
        </Button>
      </div>

      {/* Subject Cards */}
      <div className="flex flex-col gap-8">
        {subjects.length === 0 ? (
          <Card className="text-center py-12 flex flex-col items-center justify-center gap-4">
            <BookOpen className="w-10 h-10 text-[#FF9A4D]" />
            <h3 className="text-sm font-bold text-text-primary">No Syllabus Subjects Created</h3>
            <p className="text-xs text-text-muted max-w-sm">
              Create your first subject card to organize chapters, target dates, and progress.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsAddSubjectModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Subject
            </Button>
          </Card>
        ) : (
          subjects.map((subject: any) => {
            const rows = subject.rows || [];
            const columns = subject.columns || [];
            const doneCount = rows.filter((r: any) => r.done).length;
            const progressPct = rows.length > 0 ? Math.round((doneCount / rows.length) * 100) : 0;

            return (
              <Card key={subject.id} className="flex flex-col gap-5 p-6 bg-white/95 dark:bg-zinc-900/95">
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      defaultValue={subject.title}
                      onBlur={(e) => updateSubjectMutation.mutate({ id: subject.id, title: e.target.value })}
                      className="text-lg font-extrabold text-text-primary bg-transparent focus:outline-none focus:ring-2 focus:ring-[#FF9A4D] rounded-xl px-2 py-0.5"
                    />

                    {/* Progress chips */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-muted bg-orange-50 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                        {rows.length} rows
                      </span>
                      <span className="text-xs font-bold text-[#B85A12] bg-[#FFE9D6] px-2.5 py-0.5 rounded-full">
                        Completed {doneCount}/{rows.length} &middot; {progressPct}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        addColumnMutation.mutate({ subjectId: subject.id, name: "New Column", type: "text" })
                      }
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Column
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => addRowMutation.mutate(subject.id)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Row
                    </Button>
                    <button
                      onClick={() => deleteSubjectMutation.mutate(subject.id)}
                      className="p-1.5 text-text-muted hover:text-red-500 rounded-xl"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-orange-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF9A4D] rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-orange-100 dark:border-zinc-800 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        <th className="py-2 px-3 w-10">#</th>
                        <th className="py-2 px-3 w-12 text-center">Done</th>
                        {columns.map((col: any) => (
                          <th key={col.id} className="py-2 px-3 min-w-[140px]">
                            <div className="flex items-center justify-between gap-1 group">
                              <input
                                type="text"
                                defaultValue={col.name}
                                onBlur={(e) =>
                                  fetch(`/api/syllabus/column/${col.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ name: e.target.value }),
                                  })
                                }
                                className="bg-transparent font-bold focus:outline-none focus:ring-1 focus:ring-[#FF9A4D] rounded px-1"
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] lowercase font-medium px-1.5 py-0.5 rounded bg-orange-100 text-[#B85A12]">
                                  {col.type}
                                </span>
                                <button
                                  onClick={() => deleteColumnMutation.mutate(col.id)}
                                  className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="py-2 px-3 w-28 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: any, rIdx: number) => {
                        const cellMap: Record<string, string> = {};
                        (row.cells || []).forEach((c: any) => {
                          cellMap[c.columnId] = c.value || "";
                        });

                        // Check if overdue
                        let isOverdue = false;
                        columns.forEach((col: any) => {
                          if (col.type === "date" && cellMap[col.id] && !row.done) {
                            const target = new Date(cellMap[col.id]);
                            if (target < new Date()) isOverdue = true;
                          }
                        });

                        const firstTextVal = cellMap[columns[0]?.id] || "Topic";

                        return (
                          <tr
                            key={row.id}
                            className={`border-b border-orange-50 dark:border-zinc-800/50 hover:bg-orange-50/40 transition-colors ${
                              isOverdue ? "bg-red-50/30 dark:bg-red-950/20" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 text-xs font-bold text-text-muted">{rIdx + 1}</td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.done}
                                onChange={(e) =>
                                  toggleRowDoneMutation.mutate({ id: row.id, done: e.target.checked })
                                }
                                className="w-4 h-4 accent-[#FF9A4D] rounded cursor-pointer"
                              />
                            </td>
                            {columns.map((col: any) => {
                              const cellValue = cellMap[col.id] || "";
                              const key = `${row.id}_${col.id}`;

                              return (
                                <td key={col.id} className="py-2.5 px-3">
                                  <div className="relative">
                                    <input
                                      type={col.type === "date" ? "date" : "text"}
                                      defaultValue={cellValue}
                                      onChange={(e) => saveCell(row.id, col.id, e.target.value)}
                                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-text-primary bg-white/80 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#FF9A4D] ${
                                        row.done ? "line-through text-text-muted" : ""
                                      }`}
                                    />
                                    {cellSavings[key] && (
                                      <span className="absolute right-2 top-2 text-[9px] text-emerald-500 font-bold animate-pulse">
                                        Saved
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleAddToRevision(firstTextVal)}
                                  className="p-1 text-[#B85A12] hover:bg-orange-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                                  title="Add topic to spaced repetition revisions"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteRowMutation.mutate(row.id)}
                                  className="p-1 text-text-muted hover:text-red-500 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isAddSubjectModalOpen}
        onClose={() => setIsAddSubjectModalOpen(false)}
        title="Add Syllabus Subject"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Subject Title"
            placeholder="e.g. Modern Indian History"
            value={newSubjectTitle}
            onChange={(e) => setNewSubjectTitle(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsAddSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!newSubjectTitle.trim()}
              onClick={() => addSubjectMutation.mutate(newSubjectTitle)}
            >
              Create Subject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
