"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Search, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer } from "@/components/ui/drawer";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";
import { startDirectConversation } from "../index";
import type { User } from "@/lib/db/types";

interface NewMessageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (conversationId: string) => void;
}

export function NewMessageDrawer({ isOpen, onClose, onStart }: NewMessageDrawerProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // The Drawer unmounts its children while closed, so state resets on every
  // open — this effect only refetches the neighbour list.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void db.getUsers().then((all) => {
      if (cancelled) return;
      setUsers(all.filter((u) => u.id !== user?.id));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id]);

  const filtered = users.filter(
    (u) =>
      !search.trim() ||
      u.full_name.toLowerCase().includes(search.trim().toLowerCase()) ||
      u.neighbourhood.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSelect = async (otherUserId: string) => {
    if (!user || busyId) return;
    setBusyId(otherUserId);
    const conversationId = await startDirectConversation(user.id, otherUserId);
    setBusyId(null);
    if (conversationId) {
      onClose();
      onStart(conversationId);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="New message">
      <div className="space-y-3 py-2">
        <p className="body-md text-on-surface-variant">
          Pick a neighbour to start a private conversation.
        </p>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or neighbourhood..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        </div>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-hide -mx-2 px-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="label-md text-on-surface-variant text-center py-8">
              No neighbours found. Try a different search.
            </p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u.id)}
                disabled={busyId !== null}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-container-low transition-colors text-left disabled:opacity-60"
              >
                <Avatar src={u.avatar_url} fallback={u.full_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="label-md font-bold text-on-surface truncate">{u.full_name}</p>
                  <p className="label-sm text-on-surface-variant truncate flex items-center gap-1">
                    <MapPin size={12} className="text-secondary shrink-0" />
                    {u.neighbourhood || "Neighbourhood"}
                  </p>
                </div>
                <span className="p-2 rounded-full bg-primary-fixed/40 text-primary shrink-0">
                  <MessageCircle size={16} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}
