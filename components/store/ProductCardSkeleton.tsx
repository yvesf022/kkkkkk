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
      {/* top row */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: 90 }}>
          <Skeleton height={18} radius={999} />
        </div>
        <div style={{ width: 60 }}>
          <Skeleton height={18} radius={999} />
        </div>
      </div>

      {/* image */}
      <Skeleton height={170} radius={18} />

      {/* title */}
      <Skeleton height={16} radius={10} />

      {/* subtitle */}
      <div style={{ width: 120 }}>
        <Skeleton height={14} radius={8} />
      </div>

      {/* buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Skeleton height={40} radius={14} />
        </div>
        <div style={{ flex: 1 }}>
          <Skeleton height={40} radius={14} />
        </div>
      </div>

      {/* footer */}
      <Skeleton height={40} radius={14} />
    </div>
  );
}
