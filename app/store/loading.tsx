import ProductCardSkeleton from "@/components/store/ProductCardSkeleton";

export default function LoadingStore() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="glass neon-border" style={{ padding: 16 }}>
        <div className="neon-text" style={{ fontSize: 22, fontWeight: 1000 }}>Loading Products…</div>
        <div style={{ marginTop: 6, color: "rgba(234,246,255,0.72)", fontSize: 13 }}>
          Fetching neon inventory...
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
