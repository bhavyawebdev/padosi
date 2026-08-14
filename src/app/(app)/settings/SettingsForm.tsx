"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/db/local-db";
import { Shield, RotateCcw, LogOut, Bell, Eye } from "lucide-react";

export function SettingsForm() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = () => {
    setIsPending(true);
    logout();
    router.replace("/login");
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to reset all mock data to their original state? This cannot be undone.")) {
      db.reset();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy & Radius Settings */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-primary" />
          <h3 className="headline-md font-bold text-on-surface">Privacy & Radius</h3>
        </div>
        <p className="body-md text-on-surface-variant">
          Control how your distance is shared with surrounding neighbours.
        </p>

        <div className="pt-2 flex flex-col gap-3">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 cursor-pointer">
            <div>
              <p className="label-md font-bold text-on-surface">Coarse Location Display</p>
              <p className="body-sm text-on-surface-variant">Show distance ranges (e.g. 500m) instead of exact pin drops.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary rounded-md" />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 cursor-pointer">
            <div>
              <p className="label-md font-bold text-on-surface">Verified Badge Visibility</p>
              <p className="body-sm text-on-surface-variant">Display your verified trust level on public posts.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary rounded-md" />
          </label>
        </div>
      </div>

      {/* Developer & Data Reset */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <RotateCcw size={22} className="text-secondary" />
          <h3 className="headline-md font-bold text-on-surface">Local Storage & State</h3>
        </div>
        <p className="body-md text-on-surface-variant">
          Reset local storage mock database back to its initial clean seed state.
        </p>

        <Button
          variant="outline"
          size="md"
          className="hover-lift"
          leftIcon={<RotateCcw size={18} />}
          onClick={handleResetData}
        >
          Reset Local Database
        </Button>
      </div>

      {/* Session Management */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <LogOut size={22} className="text-error" />
          <h3 className="headline-md font-bold text-on-surface">Session</h3>
        </div>
        <Button
          onClick={handleLogout}
          variant="destructive"
          size="lg"
          className="w-full hover-lift"
          isLoading={isPending}
          leftIcon={<LogOut size={18} />}
        >
          Log Out of Aas-Paas
        </Button>
      </div>
    </div>
  );
}
