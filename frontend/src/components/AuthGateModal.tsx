"use client";

import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { OtpForm } from "@/components/OtpForm";

export function AuthGateModal() {
  const { gateOpen, closeGate } = useAuth();

  if (!gateOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-background p-6 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Verify your number to continue</span>
          <button onClick={closeGate} className="rounded-full p-1 text-muted-soft hover:bg-surface hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <OtpForm />
      </div>
    </div>
  );
}
