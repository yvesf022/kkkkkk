import Skeleton from "@/components/ui/Skeleton";

export default function ProductCardSkeleton() {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 22,
        background: "linear-gradient(135deg,#ffffff,#f8fbff)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton height={18} radius={999} style={{ width: 90 }} />
        <Skeleton height={18} radius={999} style={{ width: 60 }} />
      </div>

      <Skeleton height={170} radius={18} />

      <Skeleton height={16} radius={10} />

      <Skeleton height={14} radius={8} style={{ width: 120 }} />

      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton height={40} radius={14} style={{ flex: 1 }} />
        <Skeleton height={40} radius={14} style={{ flex: 1 }} />
      </div>

      <Skeleton height={40} radius={14} />
    </div>
  );
}
