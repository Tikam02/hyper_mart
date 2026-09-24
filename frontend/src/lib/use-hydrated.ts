"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while server-rendering and during the first client render, true after.
 *
 * Anything derived from `Date.now()` — "4h ago", "6d left" — is a hydration
 * hazard: the server renders against its own clock and the phone hydrates
 * against a clock that may be minutes off, and any difference makes React
 * discard the server HTML and warn. Gate those strings on this so the first
 * client render matches the server exactly, then fill them in.
 *
 * useSyncExternalStore rather than a setState in an effect: same result, and it
 * doesn't trip react-hooks/set-state-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
