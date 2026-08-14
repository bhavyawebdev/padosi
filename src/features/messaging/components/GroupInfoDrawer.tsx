"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, UserPlus, X, Check, LogOut, Search, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db/local-db";
import { useDbSync } from "@/lib/db/use-db-sync";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Conversation, ConversationMemberWithUser, MemberRole, User } from "@/lib/db/types";

interface GroupInfoDrawerProps {
  conversationId: string;
  myRole: MemberRole | null;
  isOpen: boolean;
  onClose: () => void;
  onLeft: () => void;
}

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function GroupInfoDrawer({
  conversationId,
  myRole,
  isOpen,
  onClose,
  onLeft,
}: GroupInfoDrawerProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<ConversationMemberWithUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isOpen || !conversationId) return;
    const [conv, memberRows, users] = await Promise.all([
      db.getConversation(conversationId),
      db.getConversationMembers(conversationId),
      db.getUsers(),
    ]);
    if (!conv) return;
    setConversation(conv);
    setMembers(memberRows);
    setAllUsers(users);
    setRenameValue(conv.name || "");
  }, [isOpen, conversationId]);

  useDbSync(load, [isOpen, conversationId]);

  const canManage = myRole === "owner" || myRole === "admin";
  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = allUsers
    .filter((u) => u.id !== user?.id && !memberIds.has(u.id))
    .filter(
      (u) =>
        !search.trim() ||
        u.full_name.toLowerCase().includes(search.trim().toLowerCase()) ||
        u.neighbourhood.toLowerCase().includes(search.trim().toLowerCase())
    );

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === conversation?.name) return;
    setBusy(true);
    setError("");
    await db.updateGroupConversation(conversationId, { name: renameValue });
    setBusy(false);
  };

  const handleAdd = async (userId: string) => {
    setBusy(true);
    await db.addConversationMembers(conversationId, [userId], user!.id);
    setBusy(false);
    setIsAdding(false);
    setSearch("");
  };

  const handleRemove = async (userId: string) => {
    setBusy(true);
    await db.removeConversationMember(conversationId, userId);
    setBusy(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setBusy(true);
    await db.removeConversationMember(conversationId, user.id);
    setBusy(false);
    onClose();
    onLeft();
    router.push("/messages");
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Group info">
      <div className="space-y-6 py-2">
        {/* Group identity */}
        <div className="flex items-center gap-4">
          <Avatar src={conversation?.avatar_url} fallback={conversation?.name || "G"} size="xl" />
          <div className="min-w-0">
            <h4 className="headline-md font-bold text-on-surface truncate">{conversation?.name}</h4>
            <p className="label-sm text-on-surface-variant">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Rename (owner/admin) */}
        {canManage && (
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <h5 className="label-md font-bold text-on-surface">Rename group</h5>
            <div className="flex gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Group name"
                aria-label="Group name"
              />
              <Button
                variant="primary"
                size="md"
                className="shrink-0"
                onClick={handleRename}
                disabled={busy || !renameValue.trim()}
              >
                <Check size={16} />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
            {error && <p className="label-sm text-error">{error}</p>}
          </div>
        )}

        {/* Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="label-md font-bold text-on-surface">Members</h5>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding((v) => !v)}
                leftIcon={<UserPlus size={14} />}
              >
                {isAdding ? "Cancel" : "Add"}
              </Button>
            )}
          </div>

          {isAdding && canManage && (
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search neighbours..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface label-md placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              </div>
              {candidates.length === 0 ? (
                <p className="label-sm text-on-surface-variant py-2">No more neighbours to add.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => handleAdd(candidate.id)}
                      disabled={busy}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-lowest transition-colors text-left"
                    >
                      <Avatar src={candidate.avatar_url} fallback={candidate.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="label-md font-bold text-on-surface truncate">{candidate.full_name}</p>
                        <p className="label-sm text-on-surface-variant truncate">{candidate.neighbourhood}</p>
                      </div>
                      <span className="text-primary"><UserPlus size={16} /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            {members.map((member) => {
              const isSelf = member.user_id === user?.id;
              const canRemove = canManage && !isSelf;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-container-low transition-colors"
                >
                  <Avatar
                    src={member.user.avatar_url}
                    fallback={member.user.full_name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="label-md font-bold text-on-surface truncate">
                      {member.user.full_name}
                      {isSelf && <span className="text-on-surface-variant font-medium"> (you)</span>}
                    </p>
                    <p className="label-sm text-on-surface-variant truncate">{member.user.neighbourhood}</p>
                  </div>
                  <Badge
                    variant={member.role === "owner" ? "primary" : member.role === "admin" ? "secondary" : "outline"}
                    className="shrink-0"
                  >
                    {member.role === "owner" ? (
                      <>
                        <Crown size={12} /> {ROLE_LABEL[member.role]}
                      </>
                    ) : member.role === "admin" ? (
                      <>
                        <Shield size={12} /> {ROLE_LABEL[member.role]}
                      </>
                    ) : (
                      ROLE_LABEL[member.role]
                    )}
                  </Badge>
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      disabled={busy}
                      className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors shrink-0"
                      aria-label={`Remove ${member.user.full_name}`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave */}
        <div className="pt-2 border-t border-outline-variant/20">
          <Button
            variant="outline"
            size="md"
            className="w-full text-error border-error/50 hover:bg-error-container/40 hover:border-error"
            leftIcon={<LogOut size={16} />}
            onClick={handleLeave}
            disabled={busy}
          >
            Leave group
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
