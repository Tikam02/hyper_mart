export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return dayMonth(iso);
}

export function timeLeft(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export function formatDiscount(type: "flat" | "percent", value: string): string {
  const n = Number(value);
  const clean = n % 1 === 0 ? n.toString() : n.toFixed(2);
  return type === "percent" ? `${clean}% OFF` : `₹${clean} OFF`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Indian digit grouping (1,23,456) written out by hand.
 *
 * Deliberately not `toLocaleString("en-IN")`: these strings are server-rendered
 * and then hydrated on a phone, and the two ICU versions don't always agree —
 * a difference of one character is enough for React to throw away the server
 * HTML and warn about a hydration mismatch.
 */
export function formatPrice(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₹0";
  const [whole, fraction] = Math.abs(n).toFixed(2).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  const sign = n < 0 ? "-" : "";
  return fraction === "00" ? `₹${sign}${grouped}` : `₹${sign}${grouped}.${fraction}`;
}

/** "2026-09-24T..." -> "Sep 2026", without locale data. See formatPrice. */
export function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-09-24T..." -> "24 Sep", without locale data. See formatPrice. */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "14:30:00" -> "2:30 PM". Shop timings read as clock times, not 24-hour codes. */
export function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** A one-line summary of trading hours, or null when the owner hasn't set any. */
export function hoursLabel(
  opensAt: string | null,
  closesAt: string | null,
  weeklyOff: number | null,
): string | null {
  const open = formatTime(opensAt);
  const close = formatTime(closesAt);
  if (!open || !close) return null;
  const off = weeklyOff != null ? ` · Closed ${WEEKDAYS[weeklyOff]}s` : "";
  return `${open} – ${close}${off}`;
}

/** Town names often repeat as their own city (e.g. Kondagaon, Kondagaon). */
export function placeLabel({ locality, city }: { locality: string; city: string }): string {
  return locality.toLowerCase() === city.toLowerCase() ? locality : `${locality}, ${city}`;
}
