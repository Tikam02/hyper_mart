"use client";

import { useState } from "react";
import { KeyRound, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { User } from "@/lib/types";

export function OtpForm({ onVerified, title }: { onVerified?: (user: User) => void; title?: string }) {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await requestOtp(phone);
      setDevCode(result.dev_code);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send OTP, try again");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await verifyOtp(phone, code);
      onVerified?.(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed, try again");
    } finally {
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/70">
          Mobile number
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-3 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-brand">
            <Smartphone size={17} className="text-foreground/35" />
            <span className="text-foreground/50">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              required
              maxLength={10}
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-transparent font-medium text-foreground outline-none"
            />
          </div>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy || phone.length !== 10}>
          {busy ? "Sending..." : "Send OTP"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-4">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      <p className="text-sm text-foreground/60">Enter the code sent to +91 {phone}</p>
      {devCode && (
        <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-brand-soft-foreground">
          Dev mode — your code is <span className="font-mono font-semibold">{devCode}</span>
        </p>
      )}
      <div className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-3 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-brand">
        <KeyRound size={17} className="text-foreground/35" />
        <input
          type="text"
          inputMode="numeric"
          required
          maxLength={6}
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full bg-transparent font-medium tracking-[0.3em] text-foreground outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy || code.length !== 6}>
        {busy ? "Verifying..." : "Verify & continue"}
      </Button>
      <button type="button" onClick={() => setStep("phone")} className="text-sm text-foreground/50 underline underline-offset-2">
        Change number
      </button>
    </form>
  );
}
