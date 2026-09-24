import type { PincodeInfo } from "@/lib/types";

const STORAGE_KEY = "hh_pincode";
let cached: PincodeInfo | null | undefined; // undefined = not read from localStorage yet
const listeners = new Set<() => void>();

function readFromStorage(): PincodeInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PincodeInfo) : null;
  } catch {
    return null;
  }
}

export function getSnapshot(): PincodeInfo | null {
  if (cached === undefined) cached = readFromStorage();
  return cached;
}

export function getServerSnapshot(): PincodeInfo | null {
  return null;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writePincode(info: PincodeInfo): void {
  cached = info;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // best-effort persistence only
  }
  listeners.forEach((l) => l());
}
