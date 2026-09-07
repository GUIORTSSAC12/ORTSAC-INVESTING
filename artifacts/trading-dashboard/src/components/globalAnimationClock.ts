import { useSyncExternalStore } from "react";

export const GLOBAL_ANIMATION_CYCLE_MS = 2_000;

type Listener = () => void;

let snapshot = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function tick() {
  snapshot = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  if (intervalId === null) {
    intervalId = setInterval(tick, 16);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return snapshot;
}

export function useGlobalAnimationClock() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getGlobalAnimationProgress(now: number) {
  const elapsed =
    ((now % GLOBAL_ANIMATION_CYCLE_MS) + GLOBAL_ANIMATION_CYCLE_MS) %
    GLOBAL_ANIMATION_CYCLE_MS;
  return elapsed / GLOBAL_ANIMATION_CYCLE_MS;
}

export function getGlobalDotStep(now: number): 1 | 2 | 3 {
  const progress = getGlobalAnimationProgress(now);
  return (Math.floor(progress * 3) + 1) as 1 | 2 | 3;
}