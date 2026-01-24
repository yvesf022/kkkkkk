import Skeleton from "@/components/ui/Skeleton";

export default function ProductCardSkeleton() {
  return (
    <div
      className="glass neon-border"
      style={{
        padding: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* subtle pink shimmer decor */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 260px at 10% 10%, rgba(255, 34, 140, 0.10), transparent 60%)",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, position: "relative" }}>
        <div style={{ width: 120 }}>
          <Skeleton height={22} radius={999} />
        </div>
        <div style={{ width: 78 }}>
          <Skeleton height={22} radius={999} />
        </div>
      </div>

      <div style={{ marginTop: 12, position: "relative" }}>
        <Skeleton height={170} radius={20} />
      </div>

      <div style={{ marginTop: 12, position: "relative" }}>
        <Skeleton height={18} radius={12} />
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          position: "relative",
        }}
      >
        <div style={{ width: 90 }}>
          <Skeleton height={16} radius={10} />
        </div>
        <div style={{ width: 140 }}>
          <Skeleton height={16} radius={10} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, position: "relative" }}>
        <Skeleton height={40} radius={16} />
        <Skeleton height={40} radius={16} />
      </div>

      <div style={{ marginTop: 10, position: "relative" }}>
        <Skeleton height={40} radius={16} />
      </div>
    </div>
  );
}
