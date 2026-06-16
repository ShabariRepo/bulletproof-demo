// Client-safe formatters. Kept separate from lib/demo-data.ts (which imports
// node:fs and must never enter a client bundle) so client components can format
// currency/seconds without dragging server-only modules into the browser build.

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(value);
}

export function formatSeconds(value: number) {
  return `${value.toFixed(1)}s`;
}

// Deterministic date formatters — pin the locale so server-rendered HTML and
// client hydration produce the IDENTICAL string (an unpinned toLocaleString()
// renders "2:38:02 p.m." on a Node en-CA server and "2:38:02 PM" in an en-US
// browser, which trips React's hydration-mismatch error).
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
