"use client";

import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ toast */

export type ToastAction = { label: string; run: () => void };
export type ToastData = { id: number; msg: string; actions?: ToastAction[] };

let toastState: ToastData | null = null;
let toastId = 0;
const toastListeners = new Set<() => void>();
const emitToast = () => toastListeners.forEach((l) => l());

export const toast = {
  show(msg: string, actions?: ToastAction[]) {
    toastState = { id: ++toastId, msg, actions };
    emitToast();
  },
  dismiss(id?: number) {
    if (id === undefined || toastState?.id === id) {
      toastState = null;
      emitToast();
    }
  },
  subscribe(l: () => void) {
    toastListeners.add(l);
    return () => {
      toastListeners.delete(l);
    };
  },
  get: () => toastState,
};

export function useToast(): ToastData | null {
  return useSyncExternalStore(toast.subscribe, toast.get, () => null);
}

/* ----------------------------------------------------- live announcements */

let liveMsg = "";
let liveN = 0;
const liveListeners = new Set<() => void>();

/** Politely announce a message to screen readers (via <LiveRegion/>). */
export function announce(msg: string) {
  liveMsg = msg;
  liveN++;
  liveListeners.forEach((l) => l());
}

export function useAnnouncement(): { n: number; msg: string } {
  const snap = useSyncExternalStore(
    (l) => {
      liveListeners.add(l);
      return () => {
        liveListeners.delete(l);
      };
    },
    () => `${liveN}\u0000${liveMsg}`,
    () => `0\u0000`,
  );
  const [n, msg] = snap.split("\u0000");
  return { n: Number(n), msg };
}
