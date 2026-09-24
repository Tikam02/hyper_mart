"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { PincodeInfo } from "@/lib/types";
import { getServerSnapshot, getSnapshot, subscribe, writePincode } from "@/lib/pincode-store";

interface PincodeContextValue {
  pincode: PincodeInfo | null;
  setPincode: (info: PincodeInfo) => void;
  resolveFromGps: () => Promise<PincodeInfo | null>;
  gpsState: "idle" | "loading" | "denied" | "error";
}

const PincodeContext = createContext<PincodeContextValue | null>(null);

export function PincodeProvider({ children }: { children: ReactNode }) {
  const pincode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [gpsState, setGpsState] = useState<PincodeContextValue["gpsState"]>("idle");

  const resolveFromGps = useCallback(async (): Promise<PincodeInfo | null> => {
    if (!("geolocation" in navigator)) {
      setGpsState("error");
      return null;
    }
    setGpsState("loading");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const info = await api.get<PincodeInfo>(
              `/api/pincodes/resolve?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
            );
            writePincode(info);
            setGpsState("idle");
            resolve(info);
          } catch {
            setGpsState("error");
            resolve(null);
          }
        },
        (err) => {
          setGpsState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
          resolve(null);
        },
        { timeout: 10000 }
      );
    });
  }, []);

  return (
    <PincodeContext.Provider value={{ pincode, setPincode: writePincode, resolveFromGps, gpsState }}>
      {children}
    </PincodeContext.Provider>
  );
}

export function usePincode() {
  const ctx = useContext(PincodeContext);
  if (!ctx) throw new Error("usePincode must be used within PincodeProvider");
  return ctx;
}
