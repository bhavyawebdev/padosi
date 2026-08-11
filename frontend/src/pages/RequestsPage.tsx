import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

const TABS = [
  { to: "/nearby", label: "Nearby" },
  { to: "/help", label: "Help" },
  { to: "/needs", label: "Needs" },
];

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

  // Browsing another locality? Query around it instead of the GPS point.
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
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* Module tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-margin-mobile px-margin-mobile">
        {TABS.map((tab) =>
          tab.to === "/needs" ? (
            <button
              key={tab.to}
              className="bg-primary-container text-on-primary-container rounded-full px-4 py-2 text-label-md font-label-md whitespace-nowrap transition-transform duration-150 active:scale-95 shadow-sm"
            >
              {tab.label}
            </button>
          ) : (
            <Link
              key={tab.to}
              to={tab.to}
              className="bg-surface-container-low text-on-surface-variant border border-outline-variant rounded-full px-4 py-2 text-label-md font-label-md whitespace-nowrap hover:bg-surface-variant transition-colors"
            >
              {tab.label}
            </Link>
          ),
        )}
      </div>

      {/* Locality context row — browsing chip + mobile switcher */}
      <LocalityContextRow />

      <div>
        <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-background">
          Need It Now
        </h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          Borrow, share rides, grab spare tickets — from neighbors within walking distance.
        </p>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-margin-mobile px-margin-mobile">
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

      {/* Request list */}
      {!center ? (
        <LoadingState label="Locating you…" />
      ) : requests.isLoading ? (
        <div className="flex flex-col gap-8 mt-2">
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
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                add
              </span>
              Post a request
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8 mt-2">
          {(requests.data ?? []).map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setComposerOpen(true)}
        aria-label="Create a request"
        className="fixed bottom-[88px] right-margin-mobile w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 z-40"
      >
        <span aria-hidden className="material-symbols-outlined text-3xl">
          add
        </span>
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
