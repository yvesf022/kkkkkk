import StoreToolbar from "@/components/store/StoreToolbar";
import FiltersBar from "@/components/store/FiltersBar";
import ProductCard from "@/components/store/ProductCard";
import { products } from "@/lib/products";

export const dynamic = "force-dynamic";

export default function StorePage() {
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
      }}
    >
      {/* STORE TOOLBAR (SEARCH / SORT / TABS) */}
      <StoreToolbar />

      {/* FILTERS */}
      <FiltersBar />

      {/* PRODUCT GRID */}
      {products.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            opacity: 0.6,
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>
            No products available
          </h3>
          <p>Please check back later.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}
