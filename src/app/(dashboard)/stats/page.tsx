"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Trophy,
  BookOpen,
  Clock,
  BarChart3,
  Moon,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function StatsPage() {
  const [subjectRange, setSubjectRange] = useState<"7d" | "30d" | "all">("all");

  const { data: statsData, isLoading } = useQuery({
    queryKey: ["stats", subjectRange],
    queryFn: async () => {
      const res = await fetch(`/api/stats?subjectRange=${subjectRange}`);
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const streak = statsData?.streak || 0;
  const bestDay = statsData?.bestDay || { date: "N/A", hours: 0 };
  const topSubject = statsData?.topSubject || { name: "None", color: "#3B82F6", hours: 0 };
  const thisWeekHours = statsData?.thisWeekHours || 0;
  const avgSessionFormatted = statsData?.avgSessionFormatted || "0s";
  const daysRatio = statsData?.daysRatio || "0 rest / 0 study";

  // Chart datasets
  const barThisWeekData = {
    labels: statsData?.chartThisWeek?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Hours Studied",
        data: statsData?.chartThisWeek?.data || [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "#FF9A4D",
        borderRadius: 8,
        hoverBackgroundColor: "#FF8A33",
      },
    ],
  };

  const donutSubjectData = {
    labels: statsData?.chartSubject?.map((s: any) => s.name) || ["No Data"],
    datasets: [
      {
        data: statsData?.chartSubject?.map((s: any) => s.hours) || [1],
        backgroundColor: statsData?.chartSubject?.map((s: any) => s.color) || ["#E2E8F0"],
        borderWidth: 2,
        borderColor: "#FFFFFF",
      },
    ],
  };

  const line30DaysData = {
    labels: statsData?.chart30Days?.labels || [],
    datasets: [
      {
        fill: true,
        label: "Hours Per Day",
        data: statsData?.chart30Days?.data || [],
        borderColor: "#FF9A4D",
        backgroundColor: "rgba(255, 154, 77, 0.15)",
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-2">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Analytics & Stats</h1>
        <p className="text-xs text-text-muted mt-1">
          Track your study streaks, subject breakdowns, and weekly productivity trends
        </p>
      </div>

      {/* Six Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Day Streak */}
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Day Streak</span>
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">
            {streak} <span className="text-xs font-normal text-text-muted">days</span>
          </div>
        </Card>

        {/* 2. Best Day */}
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Best Day</span>
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-text-primary mt-1">
            {bestDay.hours}h
          </div>
          <span className="text-[10px] text-text-muted truncate">{bestDay.date}</span>
        </Card>

        {/* 3. Top Subject */}
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Top Subject</span>
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-text-primary mt-1 truncate">
            {topSubject.name}
          </div>
          <span className="text-[10px] text-text-muted">{topSubject.hours} hours</span>
        </Card>

        {/* 4. This Week */}
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">This Week</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">
            {thisWeekHours} <span className="text-xs font-normal text-text-muted">hrs</span>
          </div>
        </Card>

        {/* 5. Avg Session */}
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Avg Session</span>
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-text-primary mt-1 truncate">
            {avgSessionFormatted}
          </div>
        </Card>

        {/* 6. Rest / Study Days */}
        <Card className="flex flex-col gap-1 p-3.5 sm:p-4 bg-white/90 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Days Ratio</span>
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
          </div>
          <div className="text-xs font-extrabold text-text-primary mt-2 leading-tight truncate">
            {daysRatio}
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* This Week Bar Chart */}
        <Card className="md:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
            <span className="text-sm font-extrabold text-text-primary">This Week Productivity</span>
            <span className="text-xs font-bold text-[#B85A12] bg-[#FFE9D6] px-2.5 py-0.5 rounded-full">
              {thisWeekHours} hours total
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Bar
              data={barThisWeekData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: "rgba(255, 170, 100, 0.1)" } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </Card>

        {/* By Subject Donut Chart */}
        <Card className="md:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
            <span className="text-sm font-extrabold text-text-primary">By Subject</span>
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-zinc-800 p-0.5 rounded-xl border border-orange-200">
              {(["7d", "30d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSubjectRange(r)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${
                    subjectRange === r ? "bg-[#FF9A4D] text-white" : "text-text-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={donutSubjectData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Daily Activity Smooth Area Chart (Last 30 Days) */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
          <span className="text-sm font-extrabold text-text-primary">Daily Activity Trend (Last 30 Days)</span>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Line
            data={line30DaysData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: "rgba(255, 170, 100, 0.1)" } },
                x: { grid: { display: false } },
              },
            }}
          />
        </div>
      </Card>
    </div>
  );
}
