export function formatCurrency(
  amount: number | string | null | undefined
): string {
  const value = Number(amount);

  if (!isFinite(value)) return "M 0.00";

  return "M " + value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}