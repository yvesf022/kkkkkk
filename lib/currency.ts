export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount);

  if (!isFinite(value)) return "M 0";

  return `M ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
