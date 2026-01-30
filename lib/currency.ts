export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return "M0";

  return `M${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
