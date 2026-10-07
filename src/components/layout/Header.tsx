"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Timer,
  History,
  BarChart3,
  RotateCcw,
  CheckSquare,
  BookOpen,
  Calendar,
  Settings,
  Sun,
  Moon,
  LogOut,
  User,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";

const navItems = [
  { name: "Stopwatch", href: "/stopwatch", icon: Timer },
  { name: "History", href: "/history", icon: History },
  { name: "Stats", href: "/stats", icon: BarChart3 },
  { name: "Revisions", href: "/revisions", icon: RotateCcw },
  { name: "To-Dos", href: "/todos", icon: CheckSquare },
  { name: "Syllabus", href: "/syllabus", icon: BookOpen },
  { name: "Planner", href: "/planner", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  // Fetch live pending revisions count
  const { data: revisionData } = useQuery({
    queryKey: ["revisions-pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/revisions?status=active");
      if (!res.ok) return { count: 0 };
      const json = await res.json();
      return { count: json.stats?.dueTodayCount || 0 };
    },
    refetchInterval: 30000,
  });

  const pendingRevisions = revisionData?.count || 0;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      toast("Logged out", "info");
      window.location.href = "/";
    } catch (e) {
      toast("Error logging out", "error");
    }
  };

  return (
    <header className="sticky top-3 sm:top-4 z-40 w-full max-w-[1360px] mx-auto px-3 sm:px-4 mb-4 sm:mb-6">
      {/* Outer Floating Bar Container */}
      <div className="w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-[28px] border border-orange-100/70 dark:border-zinc-800 shadow-[0_8px_30px_rgba(255,140,60,0.08)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        {/* Top Row (Logo & Right Actions on mobile/tablet, flex-row on desktop) */}
        <div className="flex items-center justify-between w-full lg:w-auto">
          {/* Left: Brand Logo & Title */}
          <Link href="/stopwatch" className="flex items-center gap-2 group pl-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden shadow-md transition-transform group-hover:scale-105 shrink-0 bg-white">
              <Image src="/logo.png" alt="PrepWise Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                PrepWise
              </span>
              <span className="text-[9px] font-bold text-[#FF8A33] tracking-wider uppercase mt-0.5">by SAANKALP</span>
            </div>
          </Link>

          {/* Right Actions (Mobile & Tablet inline display) */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Revisions Pending Badge */}
            <Link
              href="/revisions"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#FFE9D6] dark:bg-[#3D2516] text-[#B85A12] dark:text-[#FFB885] hover:bg-orange-200/70 transition-colors whitespace-nowrap border border-orange-200/40 dark:border-orange-900/30"
              title={`${pendingRevisions} revisions pending`}
            >
              <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>{pendingRevisions}</span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-orange-100/50 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Circular Avatar */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-50 dark:bg-zinc-800 border border-orange-200 dark:border-zinc-700 text-[#FF8A33] flex items-center justify-center hover:ring-2 hover:ring-[#FF8A33] transition-all"
              >
                <User className="w-4 h-4" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 glass-card p-2 bg-white/95 dark:bg-zinc-900/95 shadow-xl rounded-2xl border border-orange-200/50 dark:border-zinc-700 flex flex-col gap-1 z-50 animate-fade-in">
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    <Settings className="w-4 h-4 text-zinc-500" /> Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Desktop Track Nav Pills */}
        <nav className="hidden lg:flex items-center gap-1 bg-zinc-50/80 dark:bg-zinc-800/80 px-2 py-1.5 rounded-full border border-orange-100/50 dark:border-zinc-700/50">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-[#FF8A33] text-white shadow-md shadow-orange-500/30 font-bold"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-orange-100/40 dark:hover:bg-zinc-700/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-zinc-500 dark:text-zinc-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile & Tablet Nav Pills Row (Dedicated Horizontal Scrollbar) */}
        <nav className="flex lg:hidden items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-full touch-pan-x border-t border-orange-100/40 dark:border-zinc-800/60 pt-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-[#FF8A33] text-white shadow-md font-bold"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-orange-100/40"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 pr-1 shrink-0">
          {/* Revisions Pending Badge */}
          <Link
            href="/revisions"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FFE9D6] dark:bg-[#3D2516] text-[#B85A12] dark:text-[#FFB885] hover:bg-orange-200/70 transition-colors whitespace-nowrap shrink-0 border border-orange-200/40 dark:border-orange-900/30"
            title={`${pendingRevisions} revisions pending`}
          >
            <Timer className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{pendingRevisions} pending</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-orange-100/50 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Today Date Pill */}
          <span className="hidden md:inline-block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full whitespace-nowrap shrink-0">
            {todayFormatted}
          </span>

          {/* User Profile Circular Avatar */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-9 h-9 rounded-full bg-orange-50 dark:bg-zinc-800 border border-orange-200 dark:border-zinc-700 text-[#FF8A33] flex items-center justify-center hover:ring-2 hover:ring-[#FF8A33] transition-all"
            >
              <User className="w-4 h-4" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-card p-2 bg-white/95 dark:bg-zinc-900/95 shadow-xl rounded-2xl border border-orange-200/50 dark:border-zinc-700 flex flex-col gap-1 z-50 animate-fade-in">
                <Link
                  href="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl"
                >
                  <Settings className="w-4 h-4 text-zinc-500" /> Settings
                </Link>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl w-full text-left"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
