import { useCallback, useSyncExternalStore } from "react";

const busy = new Set<number>();
const listeners = new Map<number, Set<() => void>>();

export function setTerminalBusy(leafId: number, value: boolean): void {
  if (busy.has(leafId) === value) return;
  if (value) busy.add(leafId);
  else busy.delete(leafId);
  for (const listener of listeners.get(leafId) ?? []) listener();
}

export function subscribeTerminalBusy(
  leafId: number,
  listener: () => void,
): () => void {
  let set = listeners.get(leafId);
  if (!set) {
    set = new Set();
    listeners.set(leafId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(leafId);
  };
}

export function useTerminalBusy(leafId: number | null): boolean {
  const subscribe = useCallback(
    (listener: () => void) =>
      leafId === null ? () => {} : subscribeTerminalBusy(leafId, listener),
    [leafId],
  );
  return useSyncExternalStore(
    subscribe,
    () => leafId !== null && busy.has(leafId),
    () => false,
  );
}
