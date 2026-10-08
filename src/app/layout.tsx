import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { RegisterSW } from "@/components/pwa/RegisterSW";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#FF8A33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "PrepWise — Study & Exam Preparation Tracker",
  description: "A full-stack study and exam-preparation tracker with real-time timer sync, spaced repetition revisions, syllabus tracker, and interactive planner.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PrepWise",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-background text-foreground antialiased selection:bg-orange-200 selection:text-orange-900">
        <QueryProvider>
          <ToastProvider>
            <RegisterSW />
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

