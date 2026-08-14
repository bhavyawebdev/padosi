"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Heart, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db/local-db";
import { NearbyPostWithUser } from "@/lib/db/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { CommentsSection } from "@/features/comments/components/CommentsSection";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";

export default function NearbyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [post, setPost] = useState<NearbyPostWithUser | null>(null);
  const [reactionCount, setReactionCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [reacted, setReacted] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void db.getNearbyPosts().then((posts) => {
        const found = posts.find((p) => p.id === id);
        if (found) setPost(found);
      });
      void db.getReactionCount(id).then(setReactionCount);
      void db.getCommentCount(id).then(setCommentCount);
      if (user) void db.hasReacted(id, user.id).then(setReacted);
    });
    const refresh = () => {
      void db.getReactionCount(id).then(setReactionCount);
      void db.getCommentCount(id).then(setCommentCount);
    };
    window.addEventListener("local-db-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("local-db-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [id, user]);

  const toggleReaction = async () => {
    if (!user) return;
    const res = await db.toggleReaction(id, user.id);
    setReacted(res.reacted);
    setReactionCount(res.count);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/nearby" className="inline-flex items-center gap-1.5 label-md font-bold text-primary hover:underline">
        <ArrowLeft size={18} /> Back to Nearby
      </Link>

      {!post ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : (
        <Card className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <Link href={`/profile/${post.user.id}`} className="flex items-center gap-3 group min-w-0">
              <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center text-lg overflow-hidden shrink-0">
                {post.user.avatar_url ? (
                  <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  post.user.full_name?.charAt(0) || "P"
                )}
              </div>
              <div className="min-w-0">
                <h3 className="label-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  {post.user.full_name || "Neighbour"}
                </h3>
                <p className="label-sm text-on-surface-variant flex items-center gap-1">
                  <MapPin size={12} className="text-secondary" />
                  {post.user.neighbourhood || "Nearby"} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
            <Badge variant="nearby">{post.category || "General"}</Badge>
          </div>

          <p className="body-lg text-on-surface leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {post.images && post.images.length > 0 && (
            <div className="grid gap-2">
              {post.images.map((img, i) => (
                <img key={i} src={img} alt="Post media" className="w-full rounded-2xl object-cover max-h-80" />
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={() => void toggleReaction()}
              className={`flex items-center gap-1.5 label-sm font-semibold transition-colors ${
                reacted ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <Heart size={18} className={reacted ? "fill-primary" : ""} />
              <span>{reactionCount} {reactionCount === 1 ? "Like" : "Likes"}</span>
            </button>
            <span className="flex items-center gap-1.5 label-sm font-semibold text-on-surface-variant">
              <MessageCircle size={18} />
              <span>{commentCount} Responses</span>
            </span>
            <span className="label-sm text-on-surface-variant/70 ml-auto">
              Posted {format(new Date(post.created_at), "d MMM yyyy, h:mm a")}
            </span>
          </div>

          <CommentsSection postId={id} postAuthorId={post.user_id} />
        </Card>
      )}
    </div>
  );
}
