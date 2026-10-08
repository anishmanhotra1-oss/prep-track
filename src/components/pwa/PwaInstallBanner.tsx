"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share2 } from "lucide-react";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA standalone app
    const isAppStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isAppStandalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(iosDevice);

    if (iosDevice) {
      // Show iOS banner once if not dismissed
      const dismissed = localStorage.getItem("prepwise_pwa_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    // Listen for Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("prepwise_pwa_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("prepwise_pwa_dismissed", "true");
  };

  if (isStandalone || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-zinc-900/95 dark:bg-zinc-900/95 border border-orange-500/40 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF8A33] text-white flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">Install PrepWise App</h4>
            <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
              Install on your phone for quick offline access and home screen launch!
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIos ? (
        <div className="bg-zinc-800/80 px-3 py-2 rounded-xl text-xs text-orange-200 flex items-center gap-2 border border-orange-500/20">
          <Share2 className="w-4 h-4 text-[#FF8A33] shrink-0" />
          <span>Tap <strong>Share</strong> in Safari, then select <strong>Add to Home Screen</strong> ➕</span>
        </div>
      ) : (
        deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FF8A33] hover:bg-[#FF7A1A] text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Install App Now</span>
          </button>
        )
      )}
    </div>
  );
}
