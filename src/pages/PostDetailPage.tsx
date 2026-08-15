import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { DistanceChip } from "@/components/common/DistanceChip";
import { ReportButton } from "@/components/common/ReportButton";
import { SaveButton } from "@/components/common/SaveButton";
import { Tag } from "@/components/common/Chip";
import { ErrorState, LoadingState } from "@/components/common/Feedback";
import { categoryMeta } from "@/features/feed/feedConfig";
import { reportPost } from "@/features/feed/feedApi";
import { useConfirmPost, usePost, useResolvePost } from "@/features/feed/feedHooks";
import { useAuth } from "@/hooks/useAuth";
import { shareContent } from "@/lib/share";
import { cn } from "@/lib/cn";
import { timeAgo, timeUntil } from "@/lib/geo";
import type { UserRole } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  individual: "Neighbor",
  business: "Business",
  community: "Society",
  admin: "Admin",
};

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: post, isLoading, isError, refetch } = usePost(id);
  const confirm = useConfirmPost();
  const resolve = useResolvePost();
  const [copied, setCopied] = useState(false);

  if (isLoading) return <LoadingState label="Loading post…" />;
  if (isError || !post) {
    return (
      <ErrorState
        message="This post may have expired or no longer exists."
        onRetry={() => refetch()}
      />
    );
  }

  const meta = categoryMeta(post.category);
  const isMine = user?.id === post.user_id;
  const expiry = timeUntil(post.expires_at);

  const share = async () => {
    const result = await shareContent({
      title: "Padosi",
      text: post.text,
      url: `/posts/${post.id}`,
    });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <Link
        to="/nearby"
        className="self-start inline-flex items-center gap-1.5 text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors"
      >
        <span aria-hidden className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        Back to Nearby
      </Link>

      <article
        className={cn(
          "bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden",
          post.urgent ? "border-2 border-secondary" : "border border-outline-variant",
          post.resolved && "opacity-80",
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

        {/* Author row */}
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", meta.bubble)}>
            <span aria-hidden className="material-symbols-outlined">
              {meta.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag icon={meta.icon} label={meta.label} tone="primary" />
              {post.resolved && <Tag icon="check" label="Resolved" tone="primary" />}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Avatar name={post.author_name} size="sm" />
              <p className="text-label-md font-label-md text-on-background truncate">
                {post.author_name}
              </p>
              {post.author_role && (
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  · {ROLE_LABEL[post.author_role as UserRole] ?? post.author_role}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-body-lg font-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>

        <div className="flex gap-2 flex-wrap items-center border-t border-outline-variant/50 pt-4">
          <DistanceChip distanceM={post.distance_m} />
          <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
            <span aria-hidden className="material-symbols-outlined text-[14px]">
              schedule
            </span>
            {timeAgo(post.created_at)}
          </span>
          {expiry && expiry !== "expired" && (
            <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-outline">
              <span aria-hidden className="material-symbols-outlined text-[14px]">
                hourglass_top
              </span>
              expires {expiry}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 flex-wrap">
          <button
            onClick={() => confirm.mutate(post.id)}
            disabled={post.confirmed_by_me || post.resolved || confirm.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-label-md font-label-md transition-colors active:scale-95",
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-label-md font-label-md bg-surface-container text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-95"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              {copied ? "check" : "share"}
            </span>
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
          </button>

          <SaveButton kind="post" id={post.id} label="Save" />

          {!isMine && !post.resolved && (
            <button
              onClick={() => navigate(`/messages?user=${post.user_id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-label-md font-label-md bg-surface-container text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                chat_bubble
              </span>
              <span className="hidden sm:inline">Message</span>
            </button>
          )}

          {isMine && (
            <button
              onClick={() => resolve.mutate(post.id)}
              disabled={post.resolved || resolve.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-label-md font-label-md bg-surface-container text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              <span className="hidden sm:inline">{post.resolved ? "Resolved" : "Mark resolved"}</span>
            </button>
          )}

          <div className="ml-auto">
            <ReportButton submitReport={(reason, note) => reportPost(post.id, note ? `${reason} — ${note}` : reason)} />
          </div>
        </div>
      </article>
    </div>
  );
}
