"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface OtpRequestResult {
  expires_in_seconds: number;
  dev_code: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<OtpRequestResult>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Opens the global OTP modal and resolves once the visitor verifies. Resolves
   * immediately if already signed in. Used to gate actions like claim/follow/review
   * from anywhere without each caller building its own login form. */
  requireAuth: () => Promise<User>;
  gateOpen: boolean;
  closeGate: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const resolverRef = useRef<((user: User) => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<User | null>("/api/auth/me");
      setUser(me);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestOtp = useCallback(
    (phone: string) => api.post<OtpRequestResult>("/api/auth/otp/request", { phone }),
    []
  );

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const verifiedUser = await api.post<User>("/api/auth/otp/verify", { phone, code });
    setUser(verifiedUser);
    if (resolverRef.current) {
      resolverRef.current(verifiedUser);
      resolverRef.current = null;
    }
    setGateOpen(false);
    return verifiedUser;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return Promise.resolve(user);
    setGateOpen(true);
    return new Promise<User>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [user]);

  const closeGate = useCallback(() => {
    setGateOpen(false);
    resolverRef.current = null;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, requestOtp, verifyOtp, logout, refresh, requireAuth, gateOpen, closeGate }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
