"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { HelpProfileCard } from "./HelpProfileCard";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/local-db";
import { HelpProfileWithUser } from "@/lib/db/types";

export function HelpFeed() {
  const [profiles, setProfiles] = useState<HelpProfileWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProfiles = useCallback(async () => {
    const data = await db.getHelpProfiles();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load — setState happens inside the promise callback, never
    // synchronously in the effect body.
    void db.getHelpProfiles().then((data) => {
      setProfiles(data);
      setLoading(false);
    });

    const handleDbChange = () => void fetchProfiles();
    window.addEventListener("local-db-changed", handleDbChange);
    return () => window.removeEventListener("local-db-changed", handleDbChange);
  }, [fetchProfiles]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const filteredProfiles = profiles.filter((profile) =>
    profile.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search verified helpers by name, skill, or service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      </div>

      {filteredProfiles.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No verified helpers found"
          description="Try searching for a different skill or service like Plumbing, Gardening, or Tutoring."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredProfiles.map((profile) => (
            <HelpProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
