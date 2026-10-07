import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background">
      <Link href="/" className="mb-6 flex items-center gap-3 group">
        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md bg-white shrink-0 transition-transform group-hover:scale-105">
          <Image src="/logo.png" alt="PrepWise Logo" width={48} height={48} className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-2xl font-extrabold tracking-tight text-text-primary">PrepWise</span>
          <span className="text-[10px] font-bold text-[#FF8A33] tracking-wider uppercase mt-1">by SAANKALP</span>
        </div>
      </Link>
      <div className="w-full max-w-md glass-card p-6 sm:p-8 bg-white/95 dark:bg-zinc-900/95 shadow-xl border border-orange-200/50 dark:border-zinc-700">
        {children}
      </div>
      <p className="mt-8 text-xs text-text-muted text-center">
        &copy; {new Date().getFullYear()} PrepWise by SAANKALP. Full-stack study & exam-prep tracker.
      </p>
    </div>
  );
}
