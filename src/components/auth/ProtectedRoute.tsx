"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, requiresVerification } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (requiresVerification) {
      router.replace("/verify-email");
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [user, loading, requiresVerification, router]);

  if (loading || !user || requiresVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
