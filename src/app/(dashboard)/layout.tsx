import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { FloatingTimerDrawer } from "@/components/layout/FloatingTimerDrawer";
import { SyncListener } from "@/components/layout/SyncListener";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col pb-12">
      <OfflineBanner />
      <SyncListener userId={user.id} />
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6">{children}</main>
      <FloatingTimerDrawer />
    </div>
  );
}
