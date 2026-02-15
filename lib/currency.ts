/**
 * Currency Formatter — Lesotho Maloti (M)
 * Dot decimal format (23.4 not 23,4)
 * No thousands separator
 */

export function formatCurrency(value: number): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "M 0.0";
  }

  // Always force dot decimal
  const formatted = value.toFixed(1);

  return `M ${formatted}`;
}
