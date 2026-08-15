import { useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { Tag } from "@/components/common/Chip";
import { timeAgo } from "@/lib/geo";
import {
  useAdminModeration,
  useAdminPosts,
  useAdminProviders,
  useAdminReports,
  useAdminRequests,
} from "@/features/admin/adminHooks";
import type { AdminPost, AdminProvider, AdminReport, AdminRequest } from "@/types";

/* ------------------------------------------------------------------ */
/* shared bits                                                        */
/* ------------------------------------------------------------------ */

const FEED_CAT: Record<string, { label: string; icon: string }> = {
  traffic: { label: "Traffic", icon: "traffic" },
  civic: { label: "Civic Issue", icon: "construction" },
  safety: { label: "Safety", icon: "local_police" },
  utility: { label: "Water / Power", icon: "water_drop" },
  event: { label: "Event", icon: "event" },
  other: { label: "Other", icon: "campaign" },
};

const REQ_TYPE: Record<string, { label: string; icon: string }> = {
  borrow_lend: { label: "Borrow / Lend", icon: "handshake" },
  ride_share: { label: "Ride Share", icon: "directions_car" },
  spare_item: { label: "Spare / Ticket", icon: "confirmation_number" },
  other: { label: "Other", icon: "volunteer_activism" },
};

const PROVIDER_CAT: Record<string, { label: string; icon: string }> = {
  cook: { label: "Cook", icon: "restaurant" },
  maid: { label: "Maid", icon: "cleaning_services" },
  tutor: { label: "Tutor", icon: "school" },
  plumber: { label: "Plumber", icon: "handyman" },
  electrician: { label: "Electrician", icon: "electrical_services" },
  dog_walker: { label: "Dog Walker", icon: "pets" },
  other: { label: "Other", icon: "badge" },
};

const STATUS_TONE: Record<string, "primary" | "secondary" | "neutral"> = {
  open: "primary",
  fulfilled: "secondary",
  expired: "neutral",
};

function Row({ children }: { children: ReactNode }) {
  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
      {children}
    </li>
  );
}

function RowHeader({ title, meta }: { title: string; meta: ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-1">
      <span className="text-label-md font-label-md text-on-background">{title}</span>
      {meta}
    </div>
  );
}

function RowText({ children }: { children: ReactNode }) {
  return <p className="text-body-md font-body-md text-on-surface mt-1 line-clamp-3">{children}</p>;
}

function RowFooter({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">{children}</div>;
}

function TimeStamp({ iso, suffix }: { iso: string; suffix?: string }) {
  return (
    <span className="text-label-sm font-label-sm text-on-surface-variant">
      {timeAgo(iso)}
      {suffix ? ` · ${suffix}` : ""}
    </span>
  );
}

/** Two-step delete: first click arms the button, second click performs. */
function useTwoStepDelete(onDelete: (id: string) => void, busy: boolean) {
  const [armed, setArmed] = useState<string | null>(null);
  const handle = (id: string) => {
    if (armed === id) {
      setArmed(null);
      onDelete(id);
    } else {
      setArmed(id);
      window.setTimeout(() => setArmed((cur) => (cur === id ? null : cur)), 2500);
    }
  };
  const DeleteButton = ({ id }: { id: string }) => (
    <Button
      variant="danger"
      size="sm"
      icon={armed === id ? "warning" : "delete"}
      loading={busy}
      onClick={() => handle(id)}
    >
      {armed === id ? "Confirm delete" : "Delete"}
    </Button>
  );
  return DeleteButton;
}

function ModerationError({ onRetry }: { onRetry: () => void }) {
  return <ErrorState message="Could not load this list." onRetry={onRetry} />;
}

/* ------------------------------------------------------------------ */
/* Posts                                                              */
/* ------------------------------------------------------------------ */

function PostsList({
  posts,
  busy,
  onResolve,
  onDelete,
}: {
  posts: AdminPost[];
  busy: boolean;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const DeleteButton = useTwoStepDelete(onDelete, busy);

  if (posts.length === 0) {
    return <EmptyState icon="campaign" title="No posts" message="The feed is quiet right now." />;
  }

  return (
    <ul className="space-y-3">
      {posts.map((post) => {
        const cat = FEED_CAT[post.category] ?? FEED_CAT.other;
        return (
          <Row key={post.id}>
            <RowHeader
              title={post.author_name}
              meta={
                <>
                  <Tag icon={cat.icon} label={cat.label} />
                  {post.urgent && <Tag icon="warning" label="URGENT" tone="secondary" />}
                  {post.resolved && <Tag icon="check_circle" label="Resolved" tone="neutral" />}
                </>
              }
            />
            <RowText>{post.text}</RowText>
            <RowFooter>
              <TimeStamp iso={post.created_at} suffix={`${post.confirm_count} confirms`} />
              <div className="flex items-center gap-2">
                {!post.resolved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="check_circle"
                    loading={busy}
                    onClick={() => onResolve(post.id)}
                  >
                    Resolve
                  </Button>
                )}
                <DeleteButton id={post.id} />
              </div>
            </RowFooter>
          </Row>
        );
      })}
    </ul>
  );
}

/** Presentational posts list — used by the community dashboard. */
export function PostsPanel({ posts }: { posts: AdminPost[] }) {
  const { resolvePost, deletePost } = useAdminModeration();
  return (
    <PostsList
      posts={posts}
      busy={resolvePost.isPending || deletePost.isPending}
      onResolve={(id) => resolvePost.mutate(id)}
      onDelete={(id) => deletePost.mutate(id)}
    />
  );
}

/** Admin-console posts list — fetches all posts (admin only). */
export function AdminPostsPanel() {
  const query = useAdminPosts();

  if (query.isLoading) return <LoadingState label="Loading posts…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data) return null;

  return <PostsPanel posts={query.data} />;
}

/* ------------------------------------------------------------------ */
/* Requests                                                           */
/* ------------------------------------------------------------------ */

export function RequestsPanel() {
  const query = useAdminRequests();
  const { deleteRequest } = useAdminModeration();
  const DeleteButton = useTwoStepDelete(
    (id) => deleteRequest.mutate(id),
    deleteRequest.isPending,
  );

  if (query.isLoading) return <LoadingState label="Loading requests…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data || query.data.length === 0) {
    return <EmptyState icon="handshake" title="No requests" message="Nothing being asked for right now." />;
  }

  return (
    <ul className="space-y-3">
      {query.data.map((req: AdminRequest) => {
        const type = REQ_TYPE[req.type] ?? REQ_TYPE.other;
        return (
          <Row key={req.id}>
            <RowHeader
              title={req.author_name}
              meta={
                <>
                  <Tag icon={type.icon} label={type.label} />
                  <Tag label={req.status} tone={STATUS_TONE[req.status] ?? "neutral"} />
                </>
              }
            />
            <RowText>{req.text}</RowText>
            <RowFooter>
              <TimeStamp iso={req.created_at} suffix={`${req.reply_count} replies`} />
              <DeleteButton id={req.id} />
            </RowFooter>
          </Row>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Providers                                                          */
/* ------------------------------------------------------------------ */

export function ProvidersPanel() {
  const query = useAdminProviders();
  const { deleteProvider } = useAdminModeration();
  const DeleteButton = useTwoStepDelete(
    (id) => deleteProvider.mutate(id),
    deleteProvider.isPending,
  );

  if (query.isLoading) return <LoadingState label="Loading providers…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data || query.data.length === 0) {
    return <EmptyState icon="verified_user" title="No providers" message="No services listed yet." />;
  }

  return (
    <ul className="space-y-3">
      {query.data.map((p: AdminProvider) => {
        const cat = PROVIDER_CAT[p.category] ?? PROVIDER_CAT.other;
        return (
          <Row key={p.id}>
            <RowHeader
              title={p.display_name}
              meta={
                <>
                  <Tag icon={cat.icon} label={cat.label} />
                  {p.verified && <Tag icon="verified" label={`Verified by ${p.verification_count}`} tone="primary" />}
                </>
              }
            />
            <RowText>{p.tagline}</RowText>
            <RowFooter>
              <TimeStamp iso={p.created_at} suffix={`${p.review_count} reviews · ${p.avg_rating.toFixed(1)}★`} />
              <DeleteButton id={p.id} />
            </RowFooter>
          </Row>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                            */
/* ------------------------------------------------------------------ */

export function ReportsPanel() {
  const query = useAdminReports();
  const { dismissReport } = useAdminModeration();

  if (query.isLoading) return <LoadingState label="Loading reports…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data || query.data.length === 0) {
    return <EmptyState icon="verified_user" title="All clear" message="No open reports — the neighborhood is behaving." />;
  }

  return (
    <ul className="space-y-3">
      {query.data.map((r: AdminReport) => (
        <Row key={r.id}>
          <RowHeader
            title={r.reporter_name}
            meta={
              <>
                <Tag label={r.target_type} tone="secondary" />
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  {timeAgo(r.created_at)}
                </span>
              </>
            }
          />
          <RowText>{r.reason}</RowText>
          <RowFooter>
            <span className="text-label-sm font-label-sm text-outline">
              Target: {r.target_id.slice(0, 8)}…
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon="close"
              loading={dismissReport.isPending}
              onClick={() => dismissReport.mutate(r.id)}
            >
              Dismiss
            </Button>
          </RowFooter>
        </Row>
      ))}
    </ul>
  );
}
