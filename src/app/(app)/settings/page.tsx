import type { Metadata } from "next";
import { SettingsForm } from "./SettingsForm";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account and neighbourhood settings.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between">
        <div>
          <h1 className="headline-lg text-primary font-extrabold tracking-tight">
            Settings & Privacy
          </h1>
          <p className="body-md text-on-surface-variant mt-1">
            Manage your account status, privacy settings, and application preferences.
          </p>
        </div>
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary-fixed/40 text-primary items-center justify-center">
          <Settings size={28} />
        </div>
      </header>

      <SettingsForm />
    </div>
  );
}
