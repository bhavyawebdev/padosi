"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { db } from "@/lib/db/local-db";
import { User } from "@/lib/db/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { Award, HeartHandshake, MapPin, Check } from "lucide-react";

export function ProfileForm({ profile }: { profile: User }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError("");
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const neighbourhood = formData.get("neighbourhood") as string;
    const bio = formData.get("bio") as string;

    try {
      await db.updateUser(profile.id, {
        full_name,
        neighbourhood,
        bio,
      });
      setMessage("Profile updated successfully!");
      await login(profile.email);
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-secondary-container text-on-secondary-container font-extrabold flex items-center justify-center text-3xl shrink-0 overflow-hidden border-2 border-secondary-container shadow-sm">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            profile.full_name?.charAt(0).toUpperCase() || "U"
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
            <h2 className="headline-lg text-on-surface font-extrabold">{profile.full_name}</h2>
            <TrustBadge level="verified" />
          </div>
          <p className="body-md text-on-surface-variant flex items-center justify-center md:justify-start gap-1 font-medium">
            <MapPin size={16} className="text-secondary" />
            {profile.neighbourhood || "Indiranagar, Bengaluru"}
          </p>
          <p className="body-md text-on-surface-variant max-w-xl">
            {profile.bio || "Active community member, happy to help neighbours with gardening, pet sitting, and local recommendations."}
          </p>

          <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed/40 text-on-primary-fixed-variant label-sm font-semibold">
              <Award size={14} /> Score: {profile.neighbour_score || 120}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container label-sm font-semibold">
              <HeartHandshake size={14} /> 14 Helps Provided
            </span>
          </div>
        </div>
      </div>

      {/* Edit Details Card */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-6">
        <h3 className="headline-md font-bold text-on-surface">Edit Profile Details</h3>

        {error && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">
            {error}
          </div>
        )}
        {message && (
          <div className="p-4 rounded-2xl bg-secondary-container/40 text-on-secondary-container border border-secondary-container label-md flex items-center gap-2">
            <Check size={18} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="full_name"
            name="full_name"
            label="Full Name"
            defaultValue={profile.full_name}
            disabled={isPending}
          />

          <Input
            id="neighbourhood"
            name="neighbourhood"
            label="Neighbourhood / Locality"
            defaultValue={profile.neighbourhood}
            disabled={isPending}
          />

          <Textarea
            id="bio"
            name="bio"
            label="Bio"
            defaultValue={profile.bio || ""}
            disabled={isPending}
            rows={3}
            placeholder="Tell your neighbours a bit about yourself..."
          />

          <Button type="submit" variant="primary" size="lg" className="w-full hover-lift mt-2" isLoading={isPending}>
            Save Profile Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
