/** Presentation-only formatting. No business rules live here. */

export function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function clockTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Day label for chat separators — "Today" / "Yesterday" / a date. */
export function dayLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Distance is deliberately coarse. Exposing "1.2 km away" from a dating
 * profile is a trilateration primer; buckets are the honest resolution.
 */
export function distanceLabel(km) {
  if (km === null || km === undefined) return "Distance hidden";
  if (km < 3) return "Very close by";
  if (km < 10) return "Nearby";
  if (km < 25) return "Across town";
  if (km < 80) return "Same region";
  return "Far away";
}

export const pct = (value) => `${Math.round(value * 100)}%`;

export function scoreBand(score) {
  if (score >= 0.8) return "Strong match";
  if (score >= 0.6) return "Good match";
  if (score >= 0.4) return "Some overlap";
  return "Low overlap";
}
