"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Search, Check, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils/cn";
import type { User } from "@/lib/db/types";

interface NewGroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (conversationId: string) => void;
}

export function NewGroupDrawer({ isOpen, onClose, onStart }: NewGroupDrawerProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The Drawer unmounts its children while closed, so the form state resets on
  // every open — this effect only refetches the neighbour list.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void db.getUsers().then((all) => {
      if (cancelled) return;
      setUsers(all.filter((u) => u.id !== user?.id));
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

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) {
      setError("Give your group a name.");
      return;
    }
    if (selected.size === 0) {
      setError("Add at least one member.");
      return;
    }
    setBusy(true);
    setError("");
    const conversation = await db.createGroupConversation({
      name,
      avatar_url: avatarUrl || null,
      created_by: user.id,
      memberIds: Array.from(selected),
    });
    setBusy(false);
    if (conversation) {
      onClose();
      onStart(conversation.id);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="New group">
      <div className="space-y-4 py-2">
        <p className="body-md text-on-surface-variant">
          Create a group to coordinate with neighbours — clean-ups, events, and more.
        </p>

        {/* Group identity */}
        <div className="flex items-center gap-4">
          <Avatar src={avatarUrl || null} fallback={name || "G"} size="xl" />
          <div className="flex-1 space-y-2">
            <Input
              label="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bandra West Gardeners"
            />
          </div>
        </div>
        <Input
          label="Group image URL (optional)"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />

        {/* Member picker */}
        <div className="space-y-2">
          <h5 className="label-md font-bold text-on-surface flex items-center gap-1.5">
            <Users size={16} className="text-secondary" />
            Add members
            {selected.size > 0 && (
              <span className="label-sm text-on-surface-variant font-medium">
                ({selected.size} selected)
              </span>
            )}
          </h5>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search neighbours..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>

          <div className="max-h-52 overflow-y-auto scrollbar-hide -mx-2 px-2 space-y-1">
            {filtered.length === 0 ? (
              <p className="label-md text-on-surface-variant text-center py-6">
                No neighbours found.
              </p>
            ) : (
              filtered.map((u) => {
                const isSelected = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleMember(u.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-2xl transition-colors text-left",
                      isSelected ? "bg-primary-fixed/40" : "hover:bg-surface-container-low"
                    )}
                  >
                    <Avatar src={u.avatar_url} fallback={u.full_name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="label-md font-bold text-on-surface truncate">{u.full_name}</p>
                      <p className="label-sm text-on-surface-variant truncate flex items-center gap-1">
                        <MapPin size={12} className="text-secondary shrink-0" />
                        {u.neighbourhood || "Neighbourhood"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-on-primary"
                          : "border-outline-variant text-transparent"
                      )}
                    >
                      <Check size={14} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-error-container text-on-error-container label-md">
            {error}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full hover-lift"
          onClick={handleCreate}
          disabled={busy}
          isLoading={busy}
        >
          Create Group
        </Button>
      </div>
    </Drawer>
  );
}
