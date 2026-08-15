import { useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { Chip, Tag } from "@/components/common/Chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { SearchInput } from "@/components/common/Form";
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

/** Search box + filter chips shared by every moderation list. */
function AdminListToolbar<T extends string>({
  q,
  onQ,
  placeholder,
  chips,
  active,
  onChip,
}: {
  q: string;
  onQ: (value: string) => void;
  placeholder: string;
  chips: Array<{ value: T; label: string }>;
  active: T;
  onChip: (value: T) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <SearchInput
        placeholder={placeholder}
        value={q}
        onChange={(e) => onQ(e.target.value)}
        aria-label={placeholder}
        className="md:max-w-xs"
      />
      <div className="flex gap-1.5 flex-wrap">
        {chips.map((c) => (
          <Chip key={c.value} label={c.label} active={active === c.value} onClick={() => onChip(c.value)} />
        ))}
      </div>
    </div>
  );
}

/** Shown when a search/filter hides every row, distinct from a genuinely empty list. */
function NoMatches() {
  return <EmptyState icon="search_off" title="No matches" message="Try a different search term or filter." />;
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

const POST_FILTERS: Array<{ value: "all" | "open" | "resolved" | "urgent"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "urgent", label: "Urgent" },
];

/** Admin-console posts list — fetches all posts (admin only). */
export function AdminPostsPanel() {
  const query = useAdminPosts();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "urgent">("all");

  if (query.isLoading) return <LoadingState label="Loading posts…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data) return null;

  const term = q.trim().toLowerCase();
  const filtered = query.data.filter((p) => {
    if (term && !`${p.author_name} ${p.text}`.toLowerCase().includes(term)) return false;
    if (filter === "open" && p.resolved) return false;
    if (filter === "resolved" && !p.resolved) return false;
    if (filter === "urgent" && !p.urgent) return false;
    return true;
  });
  const hasFilters = term.length > 0 || filter !== "all";

  return (
    <div className="space-y-4">
      <AdminListToolbar
        q={q}
        onQ={setQ}
        placeholder="Search author or text…"
        chips={POST_FILTERS}
        active={filter}
        onChip={setFilter}
      />
      {filtered.length === 0 && hasFilters ? <NoMatches /> : <PostsPanel posts={filtered} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Requests                                                           */
/* ------------------------------------------------------------------ */

const REQUEST_FILTERS: Array<{ value: "all" | "open" | "fulfilled" | "expired"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "expired", label: "Expired" },
];

export function RequestsPanel() {
  const query = useAdminRequests();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "fulfilled" | "expired">("all");
  const { deleteRequest } = useAdminModeration();
  const DeleteButton = useTwoStepDelete(
    (id) => deleteRequest.mutate(id),
    deleteRequest.isPending,
  );

  if (query.isLoading) return <LoadingState label="Loading requests…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data) return null;

  const term = q.trim().toLowerCase();
  const filtered = query.data.filter((req) => {
    if (term && !`${req.author_name} ${req.text}`.toLowerCase().includes(term)) return false;
    if (status !== "all" && req.status !== status) return false;
    return true;
  });
  const hasFilters = term.length > 0 || status !== "all";

  if (query.data.length === 0) {
    return <EmptyState icon="handshake" title="No requests" message="Nothing being asked for right now." />;
  }

  return (
    <div className="space-y-4">
      <AdminListToolbar
        q={q}
        onQ={setQ}
        placeholder="Search requester or text…"
        chips={REQUEST_FILTERS}
        active={status}
        onChip={setStatus}
      />
      {filtered.length === 0 && hasFilters ? (
        <NoMatches />
      ) : (
        <ul className="space-y-3">
          {filtered.map((req: AdminRequest) => {
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
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Providers                                                          */
/* ------------------------------------------------------------------ */

const PROVIDER_FILTERS: Array<{ value: "all" | "verified"; label: string }> = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
];

export function ProvidersPanel() {
  const query = useAdminProviders();
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState<"all" | "verified">("all");
  const { deleteProvider } = useAdminModeration();
  const DeleteButton = useTwoStepDelete(
    (id) => deleteProvider.mutate(id),
    deleteProvider.isPending,
  );

  if (query.isLoading) return <LoadingState label="Loading providers…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data) return null;

  const term = q.trim().toLowerCase();
  const filtered = query.data.filter((p) => {
    if (term && !`${p.display_name} ${p.tagline}`.toLowerCase().includes(term)) return false;
    if (verified === "verified" && !p.verified) return false;
    return true;
  });
  const hasFilters = term.length > 0 || verified !== "all";

  if (query.data.length === 0) {
    return <EmptyState icon="verified_user" title="No providers" message="No services listed yet." />;
  }

  return (
    <div className="space-y-4">
      <AdminListToolbar
        q={q}
        onQ={setQ}
        placeholder="Search provider or service…"
        chips={PROVIDER_FILTERS}
        active={verified}
        onChip={setVerified}
      />
      {filtered.length === 0 && hasFilters ? (
        <NoMatches />
      ) : (
        <ul className="space-y-3">
          {filtered.map((p: AdminProvider) => {
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
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                            */
/* ------------------------------------------------------------------ */

const REPORT_FILTERS: Array<{ value: "all" | "feed" | "request" | "provider"; label: string }> = [
  { value: "all", label: "All" },
  { value: "feed", label: "Posts" },
  { value: "request", label: "Requests" },
  { value: "provider", label: "Providers" },
];

export function ReportsPanel() {
  const query = useAdminReports();
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<"all" | "feed" | "request" | "provider">("all");
  const { dismissReport } = useAdminModeration();

  if (query.isLoading) return <LoadingState label="Loading reports…" />;
  if (query.isError) return <ModerationError onRetry={() => void query.refetch()} />;
  if (!query.data) return null;

  const term = q.trim().toLowerCase();
  const filtered = query.data.filter((r) => {
    if (term && !`${r.reporter_name} ${r.reason}`.toLowerCase().includes(term)) return false;
    if (target !== "all" && r.target_type !== target) return false;
    return true;
  });
  const hasFilters = term.length > 0 || target !== "all";

  if (query.data.length === 0) {
    return <EmptyState icon="verified_user" title="All clear" message="No open reports — the neighborhood is behaving." />;
  }

  return (
    <div className="space-y-4">
      <AdminListToolbar
        q={q}
        onQ={setQ}
        placeholder="Search reporter or reason…"
        chips={REPORT_FILTERS}
        active={target}
        onChip={setTarget}
      />
      {filtered.length === 0 && hasFilters ? (
        <NoMatches />
      ) : (
        <ul className="space-y-3">
          {filtered.map((r: AdminReport) => (
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
      )}
    </div>
  );
}
