import { useEffect, useState } from "react";

import { Chip } from "@/components/common/Chip";
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from "@/components/common/Feedback";
import { LocalityContextRow } from "@/components/layout/LocalityContextRow";
import { CreatePostModal, type ComposePayload } from "@/components/feed/CreatePostModal";
import { RequestCard } from "@/components/requests/RequestCard";
import { REQUEST_TYPES } from "@/features/requests/requestsConfig";
import { useCreateRequest, useRequests } from "@/features/requests/requestsHooks";
import { useViewLocality } from "@/features/locality/localityStore";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { RequestType } from "@/types";

export function RequestsPage() {
  const { user } = useAuth();
  const { point, request } = useGeolocation(user?.locality);
  const { view } = useViewLocality();
  const [type, setType] = useState<RequestType | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const createRequest = useCreateRequest();

  useEffect(() => {
    request();
  }, [request]);

  const center = view ?? point;
  const requests = useRequests(
    {
      lat: center?.lat ?? 0,
      lng: center?.lng ?? 0,
      radiusKm: 3,
      type: type === "all" ? null : type,
    },
    center !== null,
  );

  const onSubmit = async (payload: ComposePayload) => {
    if (!point || payload.kind !== "request") return;
    await createRequest.mutateAsync({
      type: payload.requestType,
      text: payload.text,
      lat: point.lat,
      lng: point.lng,
      needed_by: payload.neededBy,
    });
  };

  const areaName = user?.locality?.name ?? "your area";

  return (
    <div>
      {/* Header + type filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline-lg font-bold text-3xl mb-2">Need It Now</h1>
          <p className="text-on-surface-variant">Most replies come from walking distance away.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Chip label="All" active={type === "all"} onClick={() => setType("all")} />
          {REQUEST_TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              icon={t.icon}
              active={type === t.value}
              onClick={() => setType(t.value === type ? "all" : t.value)}
            />
          ))}
        </div>
      </div>

      {/* Locality context */}
      <LocalityContextRow />

      {/* Request grid */}
      {!center ? (
        <LoadingState label="Locating you…" />
      ) : requests.isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : requests.isError ? (
        <ErrorState message={requests.error?.message ?? "Could not load requests."} onRetry={() => requests.refetch()} />
      ) : requests.data && requests.data.length === 0 ? (
        <EmptyState
          icon="handshake"
          title="Nothing needed nearby"
          message="No open requests in your area right now. Need something? Post it — neighbors are usually close by."
          action={
            <button
              onClick={() => setComposerOpen(true)}
              className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">add</span>
              Post a request
            </button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(requests.data ?? []).map((req, idx) => (
            <div key={req.id} className="animate-card-stagger hover-lift" style={{ animationDelay: `${idx * 0.05}s` }}>
              <RequestCard request={req} />
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setComposerOpen(true)}
        aria-label="Create a request"
        className="fixed bottom-[88px] right-4 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 z-40"
      >
        <span aria-hidden className="material-symbols-outlined text-3xl">add</span>
      </button>

      <CreatePostModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={onSubmit}
        modes={["help", "borrow"]}
        areaName={areaName}
      />
    </div>
  );
}
