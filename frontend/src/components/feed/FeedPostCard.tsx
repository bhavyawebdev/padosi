import { useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { DistanceChip } from "@/components/common/DistanceChip";
import { ReportButton } from "@/components/common/ReportButton";
import { SaveButton } from "@/components/common/SaveButton";
import { Tag } from "@/components/common/Chip";
import { categoryMeta } from "@/features/feed/feedConfig";
import { reportPost } from "@/features/feed/feedApi";
import { useConfirmPost, useResolvePost } from "@/features/feed/feedHooks";
import { useAuth } from "@/hooks/useAuth";
import { shareContent } from "@/lib/share";
import { cn } from "@/lib/cn";
import { timeAgo, timeUntil } from "@/lib/geo";
import type { FeedPost } from "@/types";

export function FeedPostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const meta = categoryMeta(post.category);
  const isMine = user?.id === post.user_id;
  const [copied, setCopied] = useState(false);
  const confirm = useConfirmPost();
  const resolve = useResolvePost();

  const share = async () => {
    const result = await shareContent({
      title: "LocalPulse",
      text: post.text,
      url: `/posts/${post.id}`,
    });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const expiry = timeUntil(post.expires_at);

  return (
    <article
      className={cn(
        "bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden",
        post.urgent
          ? "border-2 border-secondary shadow-[0_4px_12px_rgba(253,174,143,0.12)]"
          : "border border-outline-variant",
        post.resolved && "opacity-70",
      )}
    >
      {post.urgent && (
        <span className="absolute top-0 right-0 bg-secondary text-on-secondary px-3 py-1 rounded-bl-lg text-label-sm font-label-sm font-bold flex items-center gap-1">
          <span aria-hidden className="material-symbols-outlined text-sm">
            warning
          </span>
          URGENT
        </span>
      )}

      {/* Clickable region → post detail */}
      <Link to={`/posts/${post.id}`} className="flex flex-col gap-3 mt-4 group">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", meta.bubble)}>
            <span aria-hidden className={cn("material-symbols-outlined", "text-on-secondary-container")}>
              {meta.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-body-lg font-body-lg font-semibold text-on-background group-hover:underline">
                {meta.label}
              </h2>
              <span className="text-label-sm font-label-sm text-outline">{timeAgo(post.created_at)}</span>
            </div>
            <p className="text-label-sm font-label-sm text-on-surface-variant truncate">
              Posted by {post.author_name}
            </p>
          </div>
        </div>

        <p className="text-body-md font-body-md text-on-surface">{post.text}</p>
      </Link>

      <div className="flex gap-2 mt-1 flex-wrap items-center">
        <DistanceChip distanceM={post.distance_m} />
        {expiry !== "expired" && expiry && (
          <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-outline">
            <span aria-hidden className="material-symbols-outlined text-[14px]">
              schedule
            </span>
            expires {expiry}
          </span>
        )}
        {post.resolved && <Tag icon="check" label="Resolved" tone="primary" />}
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-outline-variant/50 mt-1 flex-wrap">
        <button
          onClick={() => confirm.mutate(post.id)}
          disabled={post.confirmed_by_me || post.resolved || confirm.isPending}
          aria-label="Confirm — still happening"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-md font-label-md transition-colors active:scale-95",
            post.confirmed_by_me
              ? "bg-primary text-on-primary"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-variant",
          )}
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL'1" }}>
            thumb_up
          </span>
          {post.confirm_count}
          {!post.confirmed_by_me && <span className="hidden sm:inline">Still happening</span>}
        </button>

        <button
          onClick={share}
          aria-label="Share post"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-md font-label-md bg-surface-container text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-95"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            {copied ? "check" : "share"}
          </span>
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>

        <SaveButton kind="post" id={post.id} label="Save" />

        {isMine && (
          <button
            onClick={() => resolve.mutate(post.id)}
            disabled={post.resolved || resolve.isPending}
            aria-label="Mark resolved"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-md font-label-md bg-surface-container text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-95"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            <span className="hidden sm:inline">{post.resolved ? "Resolved" : "Mark resolved"}</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <ReportButton submitReport={(reason, note) => reportPost(post.id, note ? `${reason} — ${note}` : reason)} />
          {post.author_role === "community" && (
            <Avatar name={post.author_name} size="sm" className="hidden md:inline-flex" />
          )}
        </div>
      </div>
    </article>
  );
}
