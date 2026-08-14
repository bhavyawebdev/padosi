import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, MessageCircle, Heart, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";
import type { NearbyPostWithUser } from "@/lib/db/types";

interface AuthorBlockProps {
  avatar: string;
  name: string;
  createdAt: string;
  hoverClass?: string;
}

function AuthorBlock({ avatar, name, createdAt, hoverClass }: AuthorBlockProps) {
  return (
    <>
      <div className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center text-base shrink-0 overflow-hidden border border-outline-variant/40">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`label-md font-bold text-on-surface ${hoverClass || ""} transition-colors`}>
            {name}
          </span>
          <span className="label-sm text-on-surface-variant/70 shrink-0">
            · {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 label-sm text-on-surface-variant">
          <MapPin size={12} className="text-secondary" />
          <span>Indiranagar · 300m away</span>
        </div>
      </div>
    </>
  );
}

interface NearbyPostCardProps {
  post: NearbyPostWithUser;
}

export function NearbyPostCard({ post }: NearbyPostCardProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    void db.getReactionCount(post.id).then(setLikes);
    void db.getCommentCount(post.id).then(setCommentCount);
    if (user) void db.hasReacted(post.id, user.id).then(setIsLiked);
    const refresh = () => {
      void db.getReactionCount(post.id).then(setLikes);
      void db.getCommentCount(post.id).then(setCommentCount);
    };
    window.addEventListener("local-db-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("local-db-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [post.id, user]);

  const handleLike = async () => {
    if (!user) return;
    const res = await db.toggleReaction(post.id, user.id);
    setIsLiked(res.reacted);
    setLikes(res.count);
  };

  const submitReport = async () => {
    if (!user || !reportReason.trim()) return;
    await db.createReport({
      reporterId: user.id,
      targetType: "post",
      targetId: post.id,
      reason: reportReason,
      description: post.content,
    });
    setReportReason("");
    setReportSent(true);
  };

  const authorName = post.user?.full_name || "Neighbour";

  return (
    <Card hoverable className="p-6 overflow-hidden">
      <div className="flex items-start justify-between">
        {post.user ? (
          <Link
            href={`/profile/${post.user.id}`}
            className="flex items-center gap-3 group min-w-0"
          >
            <AuthorBlock
              avatar={post.user.avatar_url}
              name={authorName}
              createdAt={post.created_at}
              hoverClass="group-hover:text-primary"
            />
          </Link>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <AuthorBlock
              avatar=""
              name={authorName}
              createdAt={post.created_at}
            />
          </div>
        )}

        <Badge variant="nearby" className="shrink-0">
          {post.category}
        </Badge>
      </div>

      <div className="mt-4">
        <p className="body-md text-on-surface whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      {post.images && post.images.length > 0 && (
        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: post.images.length > 1 ? '1fr 1fr' : '1fr' }}>
          {post.images.map((image, i) => (
            <div key={i} className="relative aspect-video rounded-2xl overflow-hidden bg-surface-container-high">
              <img
                src={image}
                alt="Post attachment"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-outline-variant/20 pt-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => void handleLike()}
            className={`flex items-center gap-1.5 label-sm font-semibold transition-colors ${
              isLiked ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <Heart size={18} className={isLiked ? "fill-primary" : ""} />
            <span>{likes} Likes</span>
          </button>
          <Link
            href={`/nearby/${post.id}`}
            className="flex items-center gap-1.5 label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            <MessageCircle size={18} />
            <span>{commentCount} Response{commentCount === 1 ? "" : "s"}</span>
          </Link>
        </div>
        <button
          onClick={() => {
            setReportSent(false);
            setReportOpen(true);
          }}
          className="flex items-center gap-1.5 label-sm font-semibold text-on-surface-variant hover:text-error transition-colors"
          aria-label="Report post"
        >
          <Flag size={16} />
        </button>
      </div>

      {/* Report dialog */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report post"
          onClick={() => {
            if (!reportSent) setReportOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="headline-sm font-bold text-on-surface flex items-center gap-2">
              <Flag size={18} className="text-error" />
              Report post
            </h3>
            {reportSent ? (
              <>
                <p className="body-md text-on-surface-variant">
                  Thanks — our moderation team will review this post.
                </p>
                <div className="flex justify-end">
                  <Button variant="primary" size="md" onClick={() => setReportOpen(false)}>
                    Done
                  </Button>
                </div>
              </>
            ) : user ? (
              <>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface body-md outline-none focus:border-primary"
                  aria-label="Report reason"
                >
                  <option value="">Choose a reason…</option>
                  <option value="Spam or scam">Spam or scam</option>
                  <option value="Misinformation">Misinformation</option>
                  <option value="Harassment or abuse">Harassment or abuse</option>
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
                    onClick={() => void submitReport()}
                    disabled={!reportReason.trim()}
                  >
                    Submit report
                  </Button>
                </div>
              </>
            ) : (
              <p className="body-md text-on-surface-variant">
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>{" "}
                to report this post.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
