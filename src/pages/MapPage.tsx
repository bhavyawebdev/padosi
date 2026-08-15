import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { LoadingState, ErrorState } from "@/components/common/Feedback";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useViewLocality } from "@/features/locality/localityStore";
import { useAuth } from "@/hooks/useAuth";
import { formatDistance } from "@/lib/geo";
import { toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

interface MapMarkerItem {
  id: string;
  kind: "post" | "request" | "provider";
  category: string;
  title: string;
  lat: number;
  lng: number;
  distance_m: number | null;
  meta: string | null;
  href: string;
}

const KIND_STYLE: Record<
  MapMarkerItem["kind"],
  { color: string; icon: string; label: string }
> = {
  post: { color: "#8b4e35", icon: "campaign", label: "Nearby pulses" },
  request: { color: "#2a6b73", icon: "handshake", label: "Open requests" },
  provider: { color: "#416448", icon: "verified_user", label: "Providers" },
};

/** Escape user-generated content before it goes into Leaflet's HTML popup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markerIcon(kind: MapMarkerItem["kind"], color: string): L.DivIcon {
  return L.divIcon({
    className: "lp-marker",
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 4px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.3);border:2px solid #fff;transform:rotate(-45deg)"><span class="material-symbols-outlined" style="font-size:18px;transform:rotate(45deg);line-height:1">${KIND_STYLE[kind].icon}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    popupAnchor: [0, -30],
  });
}

export function MapPage() {
  const { user } = useAuth();
  const { view } = useViewLocality();
  const geo = useGeolocation(user?.locality);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);

  const center = useMemo(() => {
    if (view) return { lat: view.lat, lng: view.lng, label: view.name };
    if (geo.point) return { lat: geo.point.lat, lng: geo.point.lng, label: user?.locality?.name ?? "You" };
    if (user?.locality) return { lat: user.locality.lat, lng: user.locality.lng, label: user.locality.name };
    return null;
  }, [view, geo.point, user]);

  // Ask for a precise fix once (falls back to locality centroid automatically).
  useEffect(() => {
    if (!center && !geo.requesting) geo.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markersQuery = useQuery({
    queryKey: ["map-markers", center?.lat, center?.lng, radiusKm],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("map_markers", {
        p_lat: center?.lat,
        p_lng: center?.lng,
        p_radius_km: radiusKm,
      });
      if (error) throw toApiError(error);
      return (data ?? []) as MapMarkerItem[];
    },
    enabled: !!center,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const data = markersQuery.data ?? null;
  const status = markersQuery.isLoading ? "loading" : markersQuery.isError ? "error" : "ready";

  // Build the Leaflet map once the container exists.
  useEffect(() => {
    if (!mapRef.current || leafletRef.current || !center) return;
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    leafletRef.current = map;
    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, [center]);

  // Sync markers.
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !data || !center) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    const bounds: L.LatLngExpression[] = [];
    data.forEach((m) => {
      const style = KIND_STYLE[m.kind];
      const marker = L.marker([m.lat, m.lng], { icon: markerIcon(m.kind, style.color) }).addTo(map);
      const dist = formatDistance(m.distance_m);
      const safeTitle = escapeHtml(m.title.length > 120 ? `${m.title.slice(0, 120)}…` : m.title);
      const safeMeta = m.meta ? escapeHtml(m.meta) : "";
      const safeHref = escapeHtml(m.href);
      marker.bindPopup(
        `<div style="font-family:Manrope,sans-serif;max-width:220px">
           <div style="font-size:12px;color:#424842;margin-bottom:4px">
             <strong>${style.label}</strong>${safeMeta ? ` · ${safeMeta}` : ""}${dist ? ` · <strong>${dist}</strong>` : ""}
           </div>
           <div style="font-size:14px;color:#1c1c19;line-height:1.4;margin-bottom:6px">${safeTitle}</div>
           <a href="${safeHref}" style="font-size:13px;font-weight:700;color:#416448">View details →</a>
         </div>`,
      );
      bounds.push([m.lat, m.lng]);
    });
    if (bounds.length > 0 && center) {
      bounds.push([center.lat, center.lng]);
      map.fitBounds(L.latLngBounds(bounds).pad(0.15));
    } else {
      map.setView([center.lat, center.lng], 14);
    }
  }, [data, center]);

  if (!center) {
    return <LoadingState label="Locating your neighbourhood…" />;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-background">Area map</h1>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">
            Everything live around <strong className="text-on-background">{center.label}</strong> — pulses,
            requests and providers at a glance.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container-lowest rounded-full border border-outline-variant p-1 shadow-sm">
          {[3, 5, 10].map((km) => (
            <button
              key={km}
              onClick={() => setRadiusKm(km)}
              className={`px-3.5 py-1.5 rounded-full text-label-sm font-label-sm transition-colors ${
                radiusKm === km ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(Object.keys(KIND_STYLE) as Array<MapMarkerItem["kind"]>).map((kind) => (
          <span
            key={kind}
            className="inline-flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-full px-3 py-1.5"
          >
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: KIND_STYLE[kind].color }}
            />
            {KIND_STYLE[kind].label}
            {data ? ` (${data.filter((m) => m.kind === kind).length})` : ""}
          </span>
        ))}
      </div>

      {status === "loading" && <LoadingState label="Drawing the map…" />}
      {status === "error" && (
        <ErrorState
          message="Couldn't load map markers. Check your connection and try again."
          onRetry={() => markersQuery.refetch()}
        />
      )}

      <div
        ref={mapRef}
        className="w-full relative z-0 rounded-2xl border border-outline-variant shadow-sm overflow-hidden bg-surface-container-lowest"
        style={{ height: "min(70vh, 640px)", minHeight: 420 }}
        aria-label="Map of nearby posts, requests and providers"
      />
    </div>
  );
}
