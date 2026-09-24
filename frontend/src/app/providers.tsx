"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { PincodeProvider } from "@/lib/pincode-context";
import { AuthGateModal } from "@/components/AuthGateModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PincodeProvider>
        {children}
        <AuthGateModal />
      </PincodeProvider>
    </AuthProvider>
  );
}
