import { products } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export default function FashionStore() {
  const list = products.filter(p => p.category === "fashion");

  return (
    <div>
      <div className="glass neon-border" style={{ padding: 16 }}>
        <div className="neon-text" style={{ fontSize: 22, fontWeight: 1000 }}>Fashion Store</div>
        <div style={{ color: "rgba(234,246,255,0.72)", fontSize: 13 }}>Cyber streetwear & futuristic drip</div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
