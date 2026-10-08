"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA ServiceWorker registered with scope: ", registration.scope);
        })
        .catch((err) => {
          console.warn("PWA ServiceWorker registration failed: ", err);
        });
    }
  }, []);

  return null;
}
