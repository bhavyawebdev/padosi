"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { NearbyFeed } from "@/features/nearby/components/NearbyFeed";
import { useUnreadCounts } from "@/features/messaging/hooks";
import { CountBadge } from "@/components/ui/count-badge";
import { Search, MapPin, Plus, HeartHandshake, AlertCircle, SlidersHorizontal, MessageSquare, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "nearby" | "help" | "need">("all");
  const { messages: unreadMessages, notifications: unreadNotifications } = useUnreadCounts();

  const userName = user?.full_name ? user.full_name.split(" ")[0] : "Neighbour";

  return (
    <div className="space-y-6">
      {/* Contextual Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow">
        <div>
          <h2 className="headline-lg text-primary font-extrabold tracking-tight">
            Welcome, {userName}!
          </h2>
          <p className="label-sm text-on-surface-variant flex items-center gap-1 mt-1 font-semibold">
            <MapPin size={14} className="text-secondary" />
            {user?.neighbourhood || "Indiranagar, Bengaluru"} · 1.5 km radius
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search neighbourhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>

          {/* Mobile access to messages & notifications (desktop uses the sidebar) */}
          <Link
            href="/messages"
            aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ""}`}
            className="relative lg:hidden w-10 h-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-all shrink-0"
          >
            <MessageSquare size={18} />
            <CountBadge count={unreadMessages} className="absolute -top-1.5 -right-1.5" />
          </Link>
          <Link
            href="/notifications"
            aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ""}`}
            className="relative lg:hidden w-10 h-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-all shrink-0"
          >
            <Bell size={18} />
            <CountBadge count={unreadNotifications} className="absolute -top-1.5 -right-1.5" />
          </Link>

          <Link href="/create">
            <Button variant="primary" size="md" className="shrink-0 hover-lift shadow-sm">
              <Plus size={18} />
              <span className="hidden sm:inline">New Post</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Module Action Shortcuts */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/create/nearby"
          className="flex flex-col items-start p-4 rounded-3xl bg-primary-fixed/40 hover:bg-primary-fixed/70 border border-primary-fixed text-on-primary-fixed-variant transition-all hover-lift soft-card-shadow"
        >
          <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center mb-2">
            <MapPin size={20} />
          </div>
          <span className="label-md font-bold">Nearby Update</span>
          <span className="label-sm text-on-surface-variant/80 hidden sm:inline">Share local news</span>
        </Link>

        <Link
          href="/create/help"
          className="flex flex-col items-start p-4 rounded-3xl bg-secondary-fixed/40 hover:bg-secondary-fixed/70 border border-secondary-fixed text-on-secondary-fixed-variant transition-all hover-lift soft-card-shadow"
        >
          <div className="w-10 h-10 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center mb-2">
            <HeartHandshake size={20} />
          </div>
          <span className="label-md font-bold">Offer Verified Help</span>
          <span className="label-sm text-on-surface-variant/80 hidden sm:inline">Share your skills</span>
        </Link>

        <Link
          href="/create/need"
          className="flex flex-col items-start p-4 rounded-3xl bg-tertiary-fixed/40 hover:bg-tertiary-fixed/70 border border-tertiary-fixed text-on-tertiary-fixed-variant transition-all hover-lift soft-card-shadow"
        >
          <div className="w-10 h-10 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center mb-2">
            <AlertCircle size={20} />
          </div>
          <span className="label-md font-bold">Need It Now</span>
          <span className="label-sm text-on-surface-variant/80 hidden sm:inline">Urgent requests</span>
        </Link>
      </div>

      {/* Filter Chips */}
      <div role="group" aria-label="Feed filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className="label-sm text-on-surface-variant font-bold flex items-center gap-1 mr-1">
          <SlidersHorizontal size={14} /> Filter:
        </span>
        <button
          onClick={() => setActiveFilter("all")}
          aria-pressed={activeFilter === "all"}
          className={`px-4 py-1.5 rounded-full label-sm font-bold transition-all ${
            activeFilter === "all"
              ? "bg-primary text-on-primary shadow-xs"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          All Updates
        </button>
        <button
          onClick={() => setActiveFilter("nearby")}
          aria-pressed={activeFilter === "nearby"}
          className={`px-4 py-1.5 rounded-full label-sm font-bold transition-all ${
            activeFilter === "nearby"
              ? "bg-primary-container text-on-primary-container shadow-xs"
              : "bg-secondary-container/30 text-on-secondary-container border border-secondary-container/40 hover:bg-secondary-container/50"
          }`}
        >
          Nearby Right Now
        </button>
        <button
          onClick={() => setActiveFilter("help")}
          aria-pressed={activeFilter === "help"}
          className={`px-4 py-1.5 rounded-full label-sm font-bold transition-all ${
            activeFilter === "help"
              ? "bg-secondary text-on-secondary shadow-xs"
              : "bg-secondary-container/30 text-on-secondary-container border border-secondary-container/40 hover:bg-secondary-container/50"
          }`}
        >
          Verified Help
        </button>
        <button
          onClick={() => setActiveFilter("need")}
          aria-pressed={activeFilter === "need"}
          className={`px-4 py-1.5 rounded-full label-sm font-bold transition-all ${
            activeFilter === "need"
              ? "bg-tertiary text-on-tertiary shadow-xs"
              : "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant border border-tertiary-fixed/60 hover:bg-tertiary-fixed/60"
          }`}
        >
          Need It Now
        </button>
      </div>

      {/* Main Feed Component */}
      <section aria-label="Neighbourhood Feed">
        <NearbyFeed filter={activeFilter} searchQuery={searchQuery} />
      </section>
    </div>
  );
}
