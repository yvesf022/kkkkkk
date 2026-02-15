/**
 * Formats amount to Lesotho Maloti
 * Example: 1234 → M 1,234.00
 */
export function formatCurrency(
  amount: number | string | null | undefined
): string {
  const value = Number(amount);

  if (!isFinite(value)) return "M 0.00";

  return `M ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
