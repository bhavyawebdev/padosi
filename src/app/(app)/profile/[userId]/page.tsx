"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Award, Pencil, CalendarDays, HeartHandshake, User, Ban, Flag, Unlock } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/db/local-db";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { NearbyPostCard } from "@/features/nearby/components/NearbyPostCard";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { startDirectConversation } from "@/features/messaging";
import { formatDate } from "@/lib/utils/format";
import type { User as UserProfile, NearbyPostWithUser, HelpProfileWithUser } from "@/lib/db/types";
import type { TrustLevel } from "@/types/domain";

function trustLevelFor(score: number | null): TrustLevel {
  if (!score || score <= 0) return "new";
  if (score >= 100) return "verified";
  if (score >= 60) return "trusted";
  if (score >= 30) return "basic";
  return "new";
}

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user: me } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<NearbyPostWithUser[]>([]);
  const [helpProfile, setHelpProfile] = useState<HelpProfileWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const load = useCallback(async () => {
    const [u, allPosts, helpProfiles] = await Promise.all([
      db.getUser(userId),
      db.getNearbyPosts(),
      db.getHelpProfiles(),
    ]);
    if (u) {
      setProfile(u);
      setPosts(allPosts.filter((p) => p.user_id === userId));
      setHelpProfile(helpProfiles.find((h) => h.user_id === userId) ?? null);
      if (me) setBlocked(await db.isBlocked(me.id, userId));
    }
    setLoading(false);
  }, [userId, me]);

  // Initial state is already `true`; load() flips it off after the fetch.
  // Deferred through a microtask so setState never runs synchronously.
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("local-db-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("local-db-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [load]);

  const isMe = me?.id === userId;

  const handleMessage = async () => {
    if (!me || messaging || blocked) return;
    setMessaging(true);
    const conversationId = await startDirectConversation(me.id, userId);
    setMessaging(false);
    if (conversationId) router.push(`/messages?c=${conversationId}`);
  };

  const handleBlock = async () => {
    if (!me) return;
    if (blocked) {
      await db.unblockUser(me.id, userId);
      setBlocked(false);
    } else {
      await db.blockUser(me.id, userId);
      setBlocked(true);
    }
  };

  const handleReport = async () => {
    if (!me || !reportReason.trim() || reportBusy) return;
    setReportBusy(true);
    await db.createReport({
      reporterId: me.id,
      targetType: "user",
      targetId: userId,
      reason: reportReason,
    });
    setReportBusy(false);
    setReportSent(true);
    setReportOpen(false);
    setReportReason("");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:p-8 soft-card-shadow flex flex-col items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<User size={28} />}
          title="Neighbour not found"
          description="This profile may have been removed or the link is incorrect."
          actionLabel="Back to Home"
          onAction={() => router.push("/home")}
        />
      </div>
    );
  }

  const firstName = profile.full_name?.split(" ")[0] || "Neighbour";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 label-md font-bold text-primary hover:underline"
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* Profile header card */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 flex flex-col items-center md:items-start md:flex-row gap-6">
        <Avatar src={profile.avatar_url} fallback={profile.full_name} size="xl" className="shrink-0" />

        <div className="flex-1 text-center md:text-left space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
            <h2 className="headline-lg text-on-surface font-extrabold">{profile.full_name}</h2>
            <TrustBadge level={trustLevelFor(profile.neighbour_score)} />
          </div>
          <p className="body-md text-on-surface-variant flex items-center justify-center md:justify-start gap-1 font-medium">
            <MapPin size={16} className="text-secondary" />
            {profile.neighbourhood || "Neighbourhood not set"}
          </p>
          <p className="body-md text-on-surface-variant max-w-xl">
            {profile.bio || "Active community member on Aas-Paas."}
          </p>

          <div className="pt-1 flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed/40 text-on-primary-fixed-variant label-sm font-semibold">
              <Award size={14} /> Score: {profile.neighbour_score || 0}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container label-sm font-semibold">
              <CalendarDays size={14} /> Member since {formatDate(profile.created_at, "MMM yyyy")}
            </span>
            {helpProfile && (
              <Badge variant="help">
                <HeartHandshake size={14} /> Offers {helpProfile.category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {isMe ? (
          <Button
            variant="outline"
            size="lg"
            className="flex-1 hover-lift"
            leftIcon={<Pencil size={18} />}
            onClick={() => router.push("/profile")}
          >
            Edit My Profile
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              className="flex-1 hover-lift"
              leftIcon={<MessageCircle size={18} />}
              onClick={handleMessage}
              isLoading={messaging}
              disabled={blocked}
            >
              {blocked ? "Blocked" : "Message"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="sm:w-auto hover-lift"
              leftIcon={blocked ? <Unlock size={18} /> : <Ban size={18} />}
              onClick={() => void handleBlock()}
            >
              {blocked ? "Unblock" : "Block"}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="sm:w-auto text-on-surface-variant"
              leftIcon={<Flag size={18} />}
              onClick={() => {
                setReportSent(false);
                setReportOpen(true);
              }}
            >
              Report
            </Button>
          </>
        )}
      </div>

      {/* Block notice */}
      {blocked && (
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 label-md text-on-surface-variant flex items-center gap-2">
          <Ban size={16} className="shrink-0" />
          You blocked {firstName}. You won&apos;t see their updates or messages, and they can&apos;t message you.
        </div>
      )}

      {/* Report dialog */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Report user">
          <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow p-6 space-y-4">
            <h3 className="headline-sm font-bold text-on-surface">Report {firstName}</h3>
            {reportSent ? (
              <p className="body-md text-on-surface-variant">
                Thanks — our moderation team will review this. Reports are kept private.
              </p>
            ) : (
              <>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface body-md outline-none focus:border-primary"
                  aria-label="Report reason"
                >
                  <option value="">Choose a reason…</option>
                  <option value="Spam or scam">Spam or scam</option>
                  <option value="Harassment or abuse">Harassment or abuse</option>
                  <option value="Fake identity">Fake identity</option>
                  <option value="Inappropriate content">Inappropriate content</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" size="md" onClick={() => setReportOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="md"
                    onClick={() => void handleReport()}
                    disabled={!reportReason.trim() || reportBusy}
                    isLoading={reportBusy}
                  >
                    Submit report
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Community updates */}
      <section aria-label={`Posts by ${firstName}`}>
        <h3 className="headline-md font-bold text-on-surface mb-3">
          Community updates by {firstName}
        </h3>
        {blocked ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-low/50 p-8 text-center">
            <p className="body-md text-on-surface-variant">
              You&apos;ve blocked {firstName}, so their updates are hidden.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-low/50 p-8 text-center">
            <p className="body-md text-on-surface-variant">
              {firstName} hasn&apos;t shared any updates yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <NearbyPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
