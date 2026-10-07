"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "@/store/useTimerStore";

export function SyncListener({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { setActiveTimer } = useTimerStore();

  useEffect(() => {
    // Initial fetch of active timer state
    fetch("/api/timer/active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.activeTimer) {
          setActiveTimer(data.activeTimer);
        }
      })
      .catch(() => {});

    // SSE connection for realtime updates
    const eventSource = new EventSource("/api/sync/sse");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "TIMER_UPDATED" && data.activeTimer) {
          setActiveTimer(data.activeTimer);
        }
        if (data.entity) {
          queryClient.invalidateQueries({ queryKey: [data.entity] });
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Reconnect after delay if disconnected
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId, queryClient, setActiveTimer]);

  return null;
}
