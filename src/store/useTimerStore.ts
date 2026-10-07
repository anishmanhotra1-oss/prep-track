import { create } from "zustand";

export interface LapItem {
  index: number;
  splitMs: number;
  totalMs: number;
}

export interface ActiveTimerData {
  id?: string;
  subjectId?: string | null;
  subjectName?: string;
  subjectColor?: string;
  topic?: string | null;
  targetSeconds?: number | null;
  startedAt?: string | null;
  accumulatedMs: number;
  pausedAt?: string | null;
  revise: boolean;
  laps: LapItem[];
  status: "idle" | "running" | "paused";
}

interface TimerStoreState {
  activeTimer: ActiveTimerData;
  isMiniDrawerOpen: boolean;
  setMiniDrawerOpen: (open: boolean) => void;
  toggleMiniDrawer: () => void;
  setActiveTimer: (timer: Partial<ActiveTimerData>) => void;
  getElapsedSeconds: () => number;
}

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  activeTimer: {
    accumulatedMs: 0,
    revise: false,
    laps: [],
    status: "idle",
  },
  isMiniDrawerOpen: false,

  setMiniDrawerOpen: (open) => set({ isMiniDrawerOpen: open }),
  toggleMiniDrawer: () => set((state) => ({ isMiniDrawerOpen: !state.isMiniDrawerOpen })),

  setActiveTimer: (timerUpdate) =>
    set((state) => ({
      activeTimer: { ...state.activeTimer, ...timerUpdate },
    })),

  getElapsedSeconds: () => {
    const { activeTimer } = get();
    let totalMs = activeTimer.accumulatedMs || 0;
    if (activeTimer.status === "running" && activeTimer.startedAt) {
      const startMs = new Date(activeTimer.startedAt).getTime();
      const nowMs = Date.now();
      totalMs += Math.max(0, nowMs - startMs);
    }
    return Math.floor(totalMs / 1000);
  },
}));
