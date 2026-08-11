/** Format a distance in metres into a human chip ("350m away", "1.2km away"). */
export function formatDistance(distanceM: number | null | undefined): string | null {
  if (distanceM === null || distanceM === undefined) return null;
  if (distanceM < 1000) return `${Math.round(distanceM)}m away`;
  return `${(distanceM / 1000).toFixed(1)}km away`;
}

/** Relative time ("10 mins ago", "2h ago") — never renders stale text. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Human countdown for "needed by" deadlines ("in 3h 20m"). */
export function timeUntil(iso: string, now: Date = new Date()): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "";
  const diffMs = target - now.getTime();
  if (diffMs <= 0) return "expired";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `in ${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return remMinutes ? `in ${hours}h ${remMinutes}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}
