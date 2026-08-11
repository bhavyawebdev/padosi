import { Link } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { DistanceChip } from "@/components/common/DistanceChip";
import { SaveButton } from "@/components/common/SaveButton";
import { requestTypeMeta } from "@/features/requests/requestsConfig";
import { cn } from "@/lib/cn";
import { timeAgo, timeUntil } from "@/lib/geo";
import type { LocalRequest } from "@/types";

export function RequestCard({ request }: { request: LocalRequest }) {
  const meta = requestTypeMeta(request.type);
  const deadline = timeUntil(request.needed_by);
  const open = request.status === "open";

  return (
    <article
      className={cn(
        "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-3 border-l-4 border-l-secondary",
        !open && "opacity-70",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={request.author_name} size="md" />
          <div>
            <h3 className="text-label-md font-label-md text-on-background font-semibold">
              {request.author_name}
            </h3>
            <p className="text-label-sm font-label-sm text-on-surface-variant">{timeAgo(request.created_at)}</p>
          </div>
        </div>
        <span className="flex items-center gap-1">
          <SaveButton kind="request" id={request.id} className="px-2 py-1" />
          <span className={cn("px-2 py-1 rounded-md text-label-sm font-label-sm flex items-center gap-1", meta.tagClass)}>
            <span aria-hidden className="material-symbols-outlined text-sm">
              {meta.icon}
            </span>
            {meta.label}
          </span>
        </span>
      </div>

      <p className="text-body-lg font-body-lg font-semibold text-on-background">{request.text}</p>

      <div className="flex gap-2 flex-wrap items-center">
        {/* The distance badge is the emotional hook — keep it prominent. */}
        <DistanceChip distanceM={request.distance_m} className="border-l-2 border-l-primary" />
        {open && deadline && (
          <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-high rounded-lg px-2 py-1">
            <span aria-hidden className="material-symbols-outlined text-[15px] text-tertiary">
              schedule
            </span>
            need by {deadline}
          </span>
        )}
        {!open && (
          <span className="inline-flex items-center gap-1 text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant rounded-lg px-2 py-1">
            <span aria-hidden className="material-symbols-outlined text-[15px]">
              {request.status === "fulfilled" ? "check_circle" : "cancel"}
            </span>
            {request.status === "fulfilled" ? "Fulfilled" : "Expired"}
          </span>
        )}
        {request.reply_count > 0 && (
          <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-outline">
            <span aria-hidden className="material-symbols-outlined text-[15px]">
              forum
            </span>
            {request.reply_count}
          </span>
        )}
      </div>

      {open && (
        <Link
          to={`/requests/${request.id}`}
          className="self-start bg-surface-container-high border border-outline text-on-surface px-4 py-2 rounded-lg text-label-md font-label-md hover:bg-surface-variant transition-colors active:scale-95"
        >
          I can help
        </Link>
      )}
    </article>
  );
}
