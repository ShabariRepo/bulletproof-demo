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
