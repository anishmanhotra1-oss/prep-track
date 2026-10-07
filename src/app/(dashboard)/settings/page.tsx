"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Clock,
  Palette,
  RotateCcw,
  KeyRound,
  Shield,
  Download,
  Upload,
  Trash2,
  Plus,
  Check,
  Archive,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F97316", // Orange
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EAB308", // Yellow
  "#14B8A6", // Teal
  "#EF4444", // Red
];

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

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile Form State
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [dayStartHour, setDayStartHour] = useState(4);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(240);
  const [weekStart, setWeekStart] = useState("monday");

  // Subject Form State
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjColor, setNewSubjColor] = useState("#3B82F6");

  // Revision Set State
  const [newSetName, setNewSetName] = useState("");
  const [newSetIntervals, setNewSetIntervals] = useState("1, 7, 30");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Account Deletion Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Fetch Settings Data
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
  });

  // Fetch Subjects Data
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  // Fetch Revision Sets Data
  const { data: revisionSetsData } = useQuery({
    queryKey: ["revision-sets"],
    queryFn: async () => {
      const res = await fetch("/api/revision-sets");
      if (!res.ok) throw new Error("Failed to load revision sets");
      return res.json();
    },
  });

  useEffect(() => {
    if (settingsData?.profile) {
      setName(settingsData.profile.name || "");
      setTimezone(settingsData.profile.timezone || "UTC");
      setDayStartHour(settingsData.profile.dayStartHour ?? 4);
      setDailyGoalMinutes(settingsData.profile.dailyGoalMinutes ?? 240);
      setWeekStart(settingsData.profile.weekStart || "monday");
    }
  }, [settingsData]);

  // Save Profile Mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast("Profile preferences saved successfully", "success");
    },
  });

  // Add Subject Mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add subject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setNewSubjName("");
      toast("Subject added", "success");
    },
  });

  // Archive / Delete Subject Mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast("Subject removed", "info");
    },
  });

  // Add Revision Set Mutation
  const addRevisionSetMutation = useMutation({
    mutationFn: async (payload: { name: string; intervals: number[] }) => {
      const res = await fetch("/api/revision-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create revision set");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revision-sets"] });
      setNewSetName("");
      setNewSetIntervals("1, 7, 30");
      toast("Revision interval set created", "success");
    },
  });

  // Password Change Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to change password");
      setCurrentPassword("");
      setNewPassword("");
      toast("Password updated successfully!", "success");
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: deleteConfirmText }),
      });
      if (!res.ok) throw new Error("Verification failed");
      toast("Account permanently deleted", "info");
      window.location.href = "/register";
    } catch (err) {
      toast("Failed to delete account. Type DELETE to confirm.", "error");
    }
  };

  // Import JSON file handler
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!res.ok) throw new Error("Import failed");
      toast("Data imported successfully!", "success");
      queryClient.invalidateQueries();
    } catch (err) {
      toast("Failed to parse backup JSON file", "error");
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-4">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Settings</h1>
        <p className="text-xs text-text-muted mt-1">
          Customize your study goals, subjects, revision intervals, and security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile & Goal Preferences Card */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-text-primary font-bold border-b border-orange-100 dark:border-zinc-800 pb-3">
            <User className="w-5 h-5 text-[#FF9A4D]" />
            <span>Profile & Study Goals</span>
          </div>

          <div className="flex flex-col gap-4">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Time Zone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-orange-200/60 dark:border-zinc-700 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9A4D]"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Day Start Hour (0-23)"
                type="number"
                min={0}
                max={23}
                value={dayStartHour}
                onChange={(e) => setDayStartHour(Number(e.target.value))}
              />
              <Input
                label="Daily Goal (Minutes)"
                type="number"
                min={15}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
              />
            </div>

            <Button
              variant="primary"
              size="md"
              isLoading={saveProfileMutation.isPending}
              onClick={() =>
                saveProfileMutation.mutate({ name, timezone, dayStartHour, dailyGoalMinutes, weekStart })
              }
              className="mt-2"
            >
              <Check className="w-4 h-4 mr-1.5" /> Save Preferences
            </Button>
          </div>
        </Card>

        {/* Subject Manager Card */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-text-primary font-bold border-b border-orange-100 dark:border-zinc-800 pb-3">
            <Palette className="w-5 h-5 text-[#FF9A4D]" />
            <span>Subject Manager</span>
          </div>

          {/* Add Subject Form */}
          <div className="flex flex-col gap-3 p-3.5 bg-orange-50/50 dark:bg-zinc-800/40 rounded-2xl border border-orange-100 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New Subject Name (e.g. Biology)"
                value={newSubjName}
                onChange={(e) => setNewSubjName(e.target.value)}
                className="py-2 text-xs"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!newSubjName.trim()}
                onClick={() => addSubjectMutation.mutate({ name: newSubjName, color: newSubjColor })}
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
            {/* Color Palette Selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-muted">Color:</span>
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSubjColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newSubjColor === c ? "#2B2118" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Subject List */}
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {subjectsData?.subjects?.map((subj: any) => (
              <div
                key={subj.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-orange-100 dark:border-zinc-700"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: subj.color }} />
                  <span className="text-sm font-semibold text-text-primary">{subj.name}</span>
                </div>
                <button
                  onClick={() => deleteSubjectMutation.mutate(subj.id)}
                  className="p-1 text-text-muted hover:text-red-500 rounded-lg transition-colors"
                  title="Remove subject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Revision Set Manager */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-text-primary font-bold border-b border-orange-100 dark:border-zinc-800 pb-3">
            <RotateCcw className="w-5 h-5 text-[#FF9A4D]" />
            <span>Spaced Repetition Sets</span>
          </div>

          <div className="flex flex-col gap-3 p-3.5 bg-orange-50/50 dark:bg-zinc-800/40 rounded-2xl border border-orange-100 dark:border-zinc-700">
            <Input
              label="Set Name"
              placeholder="e.g. Exam Cramming"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              className="py-2 text-xs"
            />
            <Input
              label="Intervals (comma separated days)"
              placeholder="1, 3, 7, 14"
              value={newSetIntervals}
              onChange={(e) => setNewSetIntervals(e.target.value)}
              className="py-2 text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={!newSetName.trim()}
              onClick={() => {
                const arr = newSetIntervals
                  .split(",")
                  .map((s) => parseInt(s.trim()))
                  .filter((n) => !isNaN(n) && n > 0);
                if (arr.length > 0) {
                  addRevisionSetMutation.mutate({ name: newSetName, intervals: arr });
                }
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Create Set
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {revisionSetsData?.revisionSets?.map((set: any) => {
              const arr = parseIntervals(set);
              return (
                <div
                  key={set.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-orange-100 dark:border-zinc-700"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{set.name}</span>
                      {set.isDefault && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#FFE9D6] text-[#B85A12]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Intervals: {arr.join(" → ")} days
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Change Password Card */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-text-primary font-bold border-b border-orange-100 dark:border-zinc-800 pb-3">
            <KeyRound className="w-5 h-5 text-[#FF9A4D]" />
            <span>Security & Password</span>
          </div>

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button type="submit" variant="secondary" size="md">
              Update Password
            </Button>
          </form>
        </Card>
      </div>

      {/* Data Export & Import Section */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-text-primary font-bold border-b border-orange-100 dark:border-zinc-800 pb-3">
          <Download className="w-5 h-5 text-[#FF9A4D]" />
          <span>Data Backup & Export</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href="/api/settings/export?format=json"
            download
            className="btn-pill bg-[#FFE9D6] text-[#B85A12] px-4 py-2 text-xs font-semibold hover:bg-orange-200 inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download JSON Backup
          </a>

          <a
            href="/api/settings/export?format=csv"
            download
            className="btn-pill bg-white dark:bg-zinc-800 text-text-primary border border-orange-200 dark:border-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-orange-50 inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download CSV Sessions
          </a>

          <label className="btn-pill bg-white dark:bg-zinc-800 text-text-primary border border-orange-200 dark:border-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-orange-50 cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-[#FF9A4D]" /> Restore from Backup JSON
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="flex flex-col gap-4 border-red-200 dark:border-red-900 bg-red-50/20">
        <div className="flex items-center gap-2 text-red-600 font-bold border-b border-red-200 dark:border-red-900 pb-3">
          <Shield className="w-5 h-5" />
          <span>Danger Zone</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-text-primary">Delete Account</h4>
            <p className="text-xs text-text-muted">
              Permanently delete your account and all stored study logs, revisions, and syllabus rows.
            </p>
          </div>
          <Button variant="destructive" size="md" onClick={() => setIsDeleteModalOpen(true)}>
            Delete Account
          </Button>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Account Deletion"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-muted">
            This action cannot be undone. To confirm, please type <strong className="text-red-500">DELETE</strong> in the box below.
          </p>
          <Input
            placeholder="Type DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
