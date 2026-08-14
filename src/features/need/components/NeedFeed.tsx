"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { NeedRequestCard } from "./NeedRequestCard";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/local-db";
import { HelpRequestWithUser } from "@/lib/db/types";

export function NeedFeed() {
  const [requests, setRequests] = useState<HelpRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRequests = useCallback(async () => {
    const data = await db.getHelpRequests();
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load — setState happens inside the promise callback, never
    // synchronously in the effect body.
    void db.getHelpRequests().then((data) => {
      setRequests(data);
      setLoading(false);
    });

    const handleDbChange = () => void fetchRequests();
    window.addEventListener("local-db-changed", handleDbChange);
    return () => window.removeEventListener("local-db-changed", handleDbChange);
  }, [fetchRequests]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const filteredRequests = requests.filter((request) =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search urgent community requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 transition-all"
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No urgent requests found"
          description="Looks like your neighbours have everything they need right now!"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredRequests.map((request) => (
            <NeedRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
