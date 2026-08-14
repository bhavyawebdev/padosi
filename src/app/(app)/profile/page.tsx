"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { ProfileForm } from "./ProfileForm";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between">
        <div>
          <h1 className="headline-lg text-primary font-extrabold tracking-tight">
            Your Profile
          </h1>
          <p className="body-md text-on-surface-variant mt-1">
            Manage your personal profile, community badges, and neighbourhood preferences.
          </p>
        </div>
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-secondary-container/30 text-secondary items-center justify-center">
          <User size={28} />
        </div>
      </header>

      <ProfileForm profile={user} />
    </div>
  );
}
