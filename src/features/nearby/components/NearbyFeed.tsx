"use client";

import React, { useEffect, useState, useCallback } from "react";
import { NearbyPostCard } from "./NearbyPostCard";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/local-db";
import { NearbyPostWithUser } from "@/lib/db/types";
import { Search } from "lucide-react";

interface NearbyFeedProps {
  filter?: "all" | "nearby" | "help" | "need";
  searchQuery?: string;
}

export function NearbyFeed({ filter = "all", searchQuery = "" }: NearbyFeedProps) {
  const [posts, setPosts] = useState<NearbyPostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");

  const effectiveSearch = searchQuery || localSearch;

  const fetchPosts = useCallback(async () => {
    const data = await db.getNearbyPosts();
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load — setState happens inside the promise callback, never
    // synchronously in the effect body.
    void db.getNearbyPosts().then((data) => {
      setPosts(data);
      setLoading(false);
    });

    const handleDbChange = () => void fetchPosts();
    window.addEventListener("local-db-changed", handleDbChange);
    return () => window.removeEventListener("local-db-changed", handleDbChange);
  }, [fetchPosts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      post.category.toLowerCase().includes(effectiveSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "nearby") return !post.category.includes("Help") && !post.category.includes("Need");
    if (filter === "help") return post.category.includes("Help") || post.category.includes("Service");
    if (filter === "need") return post.category.includes("Need") || post.category.includes("Urgent");
    return true;
  });

  return (
    <div className="space-y-4">
      {!searchQuery && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search neighbourhood feed..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No neighbourhood updates found"
          description="Try broadening your search term or selecting another filter category."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => (
            <NearbyPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
