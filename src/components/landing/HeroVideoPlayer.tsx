"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";

export function HeroVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay was prevented by browser:", err);
        });
      }
    }
  }, []);

  return (
    <div className="w-full max-w-5xl mt-4 sm:mt-8 relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-orange-200/50 via-orange-100/20 to-transparent dark:from-zinc-800/60 dark:via-zinc-900/40 border border-orange-200/60 dark:border-zinc-800 shadow-2xl overflow-hidden">
      <div className="rounded-xl sm:rounded-2xl overflow-hidden relative shadow-inner bg-zinc-950 flex items-center justify-center">
        {!hasError ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            controls
            preload="auto"
            poster="/prepwise_dashboard_preview.png"
            onError={() => setHasError(true)}
            className="w-full h-auto max-h-[650px] object-cover rounded-xl sm:rounded-2xl shadow-inner"
          >
            <source src="/demo-video.mp4" type="video/mp4" />
            <source src="/preview.mp4" type="video/mp4" />
            <source src="/demo.mp4" type="video/mp4" />
          </video>
        ) : (
          <Image
            src="/prepwise_dashboard_preview.png"
            alt="PrepWise Dashboard Preview"
            width={1200}
            height={675}
            className="w-full h-auto object-cover rounded-xl sm:rounded-2xl"
            priority
          />
        )}
      </div>
    </div>
  );
}
