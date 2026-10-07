"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Timer,
  RotateCcw,
  BookOpen,
  Calendar,
  BarChart3,
  CheckSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Brain,
  Zap,
  ShieldCheck,
  ChevronDown,
  Star,
  Users,
  Clock,
  Layers,
  Flame,
  Moon,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"stopwatch" | "revisions" | "syllabus" | "planner">("stopwatch");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "How does PrepWise's Spaced Repetition work?",
      answer:
        "PrepWise uses science-backed memory curves (Ebbinghaus Forgetting Curve) with default intervals of 1 day, 7 days, and 30 days. When you finish a topic, PrepWise automatically schedules your next review right before memory decay occurs, ensuring maximum retention.",
    },
    {
      question: "Can I use PrepWise on both laptop and mobile devices?",
      answer:
        "Yes! PrepWise features real-time synchronization with Server-Sent Events (SSE). Start a timer on your desktop, and track your active study status on your phone or tablet seamlessly.",
    },
    {
      question: "What is the Interactive Syllabus Matrix?",
      answer:
        "The Syllabus Matrix lets you build custom multi-subject syllabus tables with columns for target dates, completion checkboxes, and notes. You can sync any row directly into your Spaced Repetition revision queue with a single click.",
    },
    {
      question: "Can I customize study targets and log rest days?",
      answer:
        "Absolutely. You can set daily study goal minutes (e.g. 4 hours/day), configure your custom day start hour, and log Rest Days without breaking your study streak momentum.",
    },
    {
      question: "Is there a demo account I can try immediately?",
      answer:
        "Yes! You can test PrepWise instantly using our pre-configured demo account: demo@prepwise.app with password Prepwise123!",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBF7] dark:bg-[#14100E] text-[#2B2118] dark:text-[#F5EFEB] selection:bg-[#FF8A33] selection:text-white overflow-x-hidden">
      {/* Sticky Top Header Navigation Bar */}
      <header className="sticky top-2 sm:top-4 z-50 w-full max-w-[1360px] mx-auto px-2.5 sm:px-4">
        <div className="w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl sm:rounded-[28px] border border-orange-100/70 dark:border-zinc-800 shadow-[0_8px_30px_rgba(255,140,60,0.08)] flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden shadow-md transition-transform group-hover:scale-105 shrink-0 bg-white">
              <Image src="/logo.png" alt="PrepWise Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                PrepWise
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-[#FF8A33] tracking-wider uppercase mt-0.5">by SAANKALP</span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            <a href="#features" className="hover:text-[#FF8A33] transition-colors">
              Features
            </a>
            <a href="#spaced-repetition" className="hover:text-[#FF8A33] transition-colors">
              Spaced Repetition
            </a>
            <a href="#syllabus" className="hover:text-[#FF8A33] transition-colors">
              Syllabus Matrix
            </a>
            <a href="#testimonials" className="hover:text-[#FF8A33] transition-colors">
              Testimonials
            </a>
            <a href="#faq" className="hover:text-[#FF8A33] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-orange-50/80 dark:bg-zinc-800 hover:bg-orange-100 dark:hover:bg-zinc-700 transition-colors border border-orange-200/60 dark:border-zinc-700 flex items-center gap-1 sm:gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#FF8A33]" />
              <span>Log In</span>
            </Link>
            <Link
              href="/register"
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-bold text-white bg-[#FF8A33] hover:bg-[#FF7A1A] shadow-md shadow-orange-500/25 transition-all flex items-center gap-1 sm:gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="w-full max-w-[1280px] mx-auto px-4 pt-8 sm:pt-16 pb-12 sm:pb-16 text-center flex flex-col items-center gap-5 sm:gap-6">
          {/* Eyebrow Pill Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-orange-100/80 dark:bg-zinc-800/80 border border-orange-200 dark:border-zinc-700 text-[#B85A12] dark:text-[#FFB885] text-[11px] sm:text-xs font-bold shadow-sm max-w-full">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF8A33] shrink-0" />
            <span className="truncate">The #1 Smart Study & Exam Preparation Platform</span>
          </div>

          {/* Hero Main Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight max-w-4xl leading-[1.2] sm:leading-[1.15]">
            Master Your Exam Prep with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A33] via-[#FF9A4D] to-[#E56B10]">Spaced Repetition</span> & Live Sync
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-base md:text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
            Stop guessing what to review. PrepWise combines real-time study stopwatches, 1-7-30 day spaced repetition, interactive syllabus tracking, and smart calendar planning into one seamless workspace.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md sm:max-w-none pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-[#FF8A33] to-[#FF9A4D] hover:from-[#FF7A1A] hover:to-[#FF8A33] text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Preparing Now &mdash; It&apos;s Free</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-full bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-bold text-xs sm:text-sm border border-orange-200 dark:border-zinc-700 hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-[#FF8A33]" />
              <span>Log In to Account</span>
            </Link>
          </div>

          {/* Product Preview Image Frame */}
          <div className="w-full max-w-5xl mt-4 sm:mt-8 relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-orange-200/50 via-orange-100/20 to-transparent dark:from-zinc-800/60 dark:via-zinc-900/40 border border-orange-200/60 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="rounded-xl sm:rounded-2xl overflow-hidden relative shadow-inner bg-zinc-950">
              <Image
                src="/prepwise_dashboard_preview.png"
                alt="PrepWise Dashboard Preview"
                width={1200}
                height={675}
                className="w-full h-auto object-cover rounded-xl sm:rounded-2xl"
                priority
              />
            </div>
          </div>
        </section>

        {/* Social Proof & Metrics Bar */}
        <section className="w-full bg-white/80 dark:bg-zinc-900/80 border-y border-orange-100 dark:border-zinc-800 py-6 sm:py-8">
          <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="text-xl sm:text-3xl font-extrabold text-[#FF8A33] font-mono">10,000+</div>
              <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1">Study Hours Logged</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl sm:text-3xl font-extrabold text-[#FF8A33] font-mono">3x</div>
              <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1">Memory Retention Rate</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl sm:text-3xl font-extrabold text-[#FF8A33] font-mono">100%</div>
              <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1">Real-Time Multi-Device Sync</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl sm:text-3xl font-extrabold text-[#FF8A33] font-mono">4.9 / 5</div>
              <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1">Student Satisfaction</div>
            </div>
          </div>
        </section>

        {/* Core Features Grid Section (`#features`) */}
        <section id="features" className="w-full max-w-[1280px] mx-auto px-4 py-12 sm:py-20 flex flex-col gap-8 sm:gap-12">
          <div className="text-center flex flex-col items-center gap-2.5 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-extrabold text-[#FF8A33] uppercase tracking-widest bg-orange-100/70 dark:bg-zinc-800 px-3 py-1 rounded-full">
              Complete Prep Suite
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Everything You Need to Ace Competitive Exams
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
              Engineered for students preparing for UPSC, MCAT, GRE, GATE, USMLE, SAT, and university finals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Feature 1 */}
            <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 hover:shadow-xl transition-all border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-zinc-800 text-[#FF8A33] flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">Focus Stopwatch & Timer</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Track live study sessions with lap splits, preset countdowns (25m, 45m, 60m), subject tags, and rest day toggles.
                </p>
              </div>
            </Card>

            {/* Feature 2 */}
            <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 hover:shadow-xl transition-all border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-zinc-800 text-[#FF8A33] flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">Automated Spaced Repetition</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Automatically schedule topic revisions at 1, 7, and 30-day intervals to eliminate forgetting before exam day.
                </p>
              </div>
            </Card>

            {/* Feature 3 */}
            <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 hover:shadow-xl transition-all border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-zinc-800 text-[#FF8A33] flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">Interactive Syllabus Matrix</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Organize multi-subject syllabi into custom columns, target completion dates, and sync rows directly into revisions.
                </p>
              </div>
            </Card>

            {/* Feature 4 */}
            <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 hover:shadow-xl transition-all border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-zinc-800 text-[#FF8A33] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">Smart Drag & Drop Planner</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Time-block your days, schedule recurring study sessions, track daily routine habit streaks, and maintain consistency.
                </p>
              </div>
            </Card>

            {/* Feature 5 */}
            <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 hover:shadow-xl transition-all border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-zinc-800 text-[#FF8A33] flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">Deep Analytics & Heatmaps</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Visualize study volume with 12-week GitHub-style activity heatmaps, subject distribution pie charts, and trend line graphs.
                </p>
              </div>
            </Card>

            {/* Feature 6 */}
            <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 hover:shadow-xl transition-all border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-zinc-800 text-[#FF8A33] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">Real-Time Sync & Backup</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Instant Server-Sent Event updates across browsers, with 1-click JSON/CSV data backup & restore capability.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Spaced Repetition Science Spotlight (`#spaced-repetition`) */}
        <section id="spaced-repetition" className="w-full bg-orange-50/50 dark:bg-zinc-900/50 border-y border-orange-100 dark:border-zinc-800 py-12 sm:py-20">
          <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-5 sm:gap-6">
              <span className="text-[10px] sm:text-xs font-extrabold text-[#FF8A33] uppercase tracking-widest bg-orange-100 dark:bg-zinc-800 px-3 py-1 rounded-full w-max">
                Backed by Memory Science
              </span>
              <h2 className="text-xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
                Beating the Forgetting Curve with 1-7-30 Day Intervals
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Without revision, humans forget up to 70% of new information within 24 hours. PrepWise automatically queues your topics right at the optimum memory decay threshold, transferring knowledge from short-term memory to long-term mastery.
              </p>

              <div className="flex flex-col gap-3 pt-1 sm:pt-2">
                <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-extrabold text-xs shrink-0">
                    1d
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step 1: 24-Hour Immediate Recall</h4>
                    <p className="text-[11px] text-zinc-500">Consolidates newly learned concepts before initial decay.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 text-[#FF8A33] flex items-center justify-center font-extrabold text-xs shrink-0">
                    7d
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step 2: 7-Day Reinforcement</h4>
                    <p className="text-[11px] text-zinc-500">Strengthens neural connections ahead of weekly progress tests.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-extrabold text-xs shrink-0">
                    30d
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step 3: 30-Day Permanent Mastery</h4>
                    <p className="text-[11px] text-zinc-500">Locks memory into long-term retention for exam day.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Graphic Card */}
            <div className="lg:col-span-6 flex justify-center">
              <Card className="w-full max-w-lg p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-white dark:bg-zinc-900 border-orange-200 dark:border-zinc-700 shadow-2xl">
                <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#FF8A33]" /> Spaced Repetition Queue Preview
                  </span>
                  <span className="text-[10px] font-bold text-[#B85A12] bg-[#FFE9D6] px-2.5 py-0.5 rounded-full">
                    3 Due Today
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-orange-50/70 dark:bg-zinc-800/80 border border-orange-200/60 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Indian Polity: Constitutional Amendments</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Due: Today &middot; Step 2 of 3 (7-Day Interval)</p>
                    </div>
                    <Button variant="primary" size="sm" className="w-full sm:w-auto text-xs py-1">Complete</Button>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-2xl bg-orange-50/70 dark:bg-zinc-800/80 border border-orange-200/60 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Organic Chemistry: Reaction Mechanisms</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Due: Today &middot; Step 1 of 3 (1-Day Interval)</p>
                    </div>
                    <Button variant="primary" size="sm" className="w-full sm:w-auto text-xs py-1">Complete</Button>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-2xl bg-orange-50/70 dark:bg-zinc-800/80 border border-orange-200/60 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Microeconomics: Market Equilibrium</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Due: Tomorrow &middot; Step 3 of 3 (30-Day Interval)</p>
                    </div>
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto text-xs py-1">Snooze</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Syllabus & Planner Section (`#syllabus`) */}
        <section id="syllabus" className="w-full max-w-[1280px] mx-auto px-4 py-12 sm:py-20 flex flex-col gap-8 sm:gap-12">
          <div className="text-center flex flex-col items-center gap-2.5 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-extrabold text-[#FF8A33] uppercase tracking-widest bg-orange-100/70 dark:bg-zinc-800 px-3 py-1 rounded-full">
              Syllabus Matrix & Planner
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              From Multi-Subject Syllabus to Daily Time Blocks
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
              Sync your syllabus rows straight into active revision topics and daily planner slots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <Card className="p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-100">Custom Syllabus Matrix</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Build flexible tables for each exam subject. Add custom columns like &ldquo;Target Date&rdquo;, &ldquo;Resource Link&rdquo;, or &ldquo;Difficulty Rating&rdquo;, and track completion percentages per subject card.
              </p>
              <div className="p-3 rounded-2xl bg-orange-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-[#B85A12] dark:text-orange-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>1-Click Sync: Convert syllabus rows into active spaced repetition cards.</span>
              </div>
            </Card>

            <Card className="p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF8A33] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-100">Smart Calendar & Routines</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Time-block study sessions across Day, Workweek, and 7-Day views. Set recurring habit routines with streak counters so you never miss a daily study target.
              </p>
              <div className="p-3 rounded-2xl bg-orange-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-[#B85A12] dark:text-orange-300 flex items-center gap-2">
                <Flame className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Streak Protection: Rest day toggles preserve your streak without penalty.</span>
              </div>
            </Card>
          </div>
        </section>

        {/* Testimonials Section (`#testimonials`) */}
        <section id="testimonials" className="w-full bg-orange-50/50 dark:bg-zinc-900/50 border-y border-orange-100 dark:border-zinc-800 py-12 sm:py-20">
          <div className="max-w-[1280px] mx-auto px-4 flex flex-col gap-8 sm:gap-12">
            <div className="text-center flex flex-col items-center gap-2.5 sm:gap-3">
              <span className="text-[10px] sm:text-xs font-extrabold text-[#FF8A33] uppercase tracking-widest bg-orange-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                Student Testimonials
              </span>
              <h2 className="text-xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Trusted by Top Rankers Worldwide
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Card className="p-5 sm:p-6 flex flex-col justify-between gap-4 bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-800">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                    &ldquo;PrepWise&apos;s spaced repetition saved my UPSC preparation. I used to forget Modern History dates within a week, but the 1-7-30 schedule kept everything fresh.&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 border-t border-orange-100 dark:border-zinc-800 pt-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-200 text-[#B85A12] font-bold flex items-center justify-center text-xs shrink-0">
                    AR
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Aarav Sharma</div>
                    <div className="text-[10px] text-zinc-500">UPSC Civil Services Aspirant</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6 flex flex-col justify-between gap-4 bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-800">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                    &ldquo;The real-time timer sync across my desktop and iPad is incredible. I can log my study sessions while studying in the library without any hassle.&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 border-t border-orange-100 dark:border-zinc-800 pt-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                    SP
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Sophia Patel</div>
                    <div className="text-[10px] text-zinc-500">MCAT Candidate (Score 518)</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6 flex flex-col justify-between gap-4 bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-800">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                    &ldquo;The Syllabus Matrix combined with GitHub-style study heatmaps gave me complete visibility over my GATE Engineering syllabus progress.&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 border-t border-orange-100 dark:border-zinc-800 pt-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-200 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                    RM
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Rohan Mehta</div>
                    <div className="text-[10px] text-zinc-500">GATE CS Top 100 Ranker</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section (`#faq`) */}
        <section id="faq" className="w-full max-w-[960px] mx-auto px-4 py-12 sm:py-20 flex flex-col gap-8 sm:gap-10">
          <div className="text-center flex flex-col items-center gap-2.5 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-extrabold text-[#FF8A33] uppercase tracking-widest bg-orange-100/70 dark:bg-zinc-800 px-3 py-1 rounded-full">
              Got Questions?
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, index) => (
              <Card key={index} className="p-0 overflow-hidden bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-800">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#FF8A33] shrink-0 transition-transform duration-200 ${
                      openFaqIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-zinc-600 dark:text-zinc-400 border-t border-orange-50 dark:border-zinc-800 pt-3 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Bottom Call To Action Banner - Ultra High Contrast & Visibility */}
        <section className="w-full max-w-[1280px] mx-auto px-3 sm:px-4 pb-12 sm:pb-20">
          <div className="p-6 sm:p-12 rounded-3xl bg-gradient-to-br from-[#E56B10] via-[#FF7A1A] to-[#D05600] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border border-orange-400/40 dark:border-zinc-800 text-white flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
            {/* Background Accent Glow */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center gap-2 z-10">
              <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-sm tracking-tight max-w-2xl">
                Ready to Transform Your Study Habits?
              </h2>
              <p className="text-xs sm:text-base text-amber-100 dark:text-zinc-300 max-w-lg leading-relaxed font-semibold">
                Join thousands of dedicated students maximizing their exam scores with PrepWise today.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full sm:w-auto">
              <Link
                href="/register"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white text-[#B85A12] dark:text-zinc-900 font-extrabold text-xs sm:text-sm hover:bg-orange-50 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-black/30 dark:bg-zinc-800/80 hover:bg-black/40 text-white font-bold text-xs sm:text-sm border border-white/30 dark:border-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-orange-200" />
                <span>Sign In to Workspace</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-zinc-950 border-t border-orange-100 dark:border-zinc-800 py-8 sm:py-12">
        <div className="max-w-[1280px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
              <Image src="/logo.png" alt="PrepWise Logo" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">PrepWise</span>
              <span className="text-[8px] font-bold text-[#FF8A33] tracking-wider uppercase mt-0.5">by SAANKALP</span>
            </div>
            <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs">&copy; {new Date().getFullYear()} PrepWise by SAANKALP. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-semibold text-[11px] sm:text-xs">
            <Link href="/login" className="hover:text-[#FF8A33]">Log In</Link>
            <Link href="/register" className="hover:text-[#FF8A33]">Register</Link>
            <a href="#features" className="hover:text-[#FF8A33]">Features</a>
            <a href="#faq" className="hover:text-[#FF8A33]">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

