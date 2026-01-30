import StoreToolbar from "@/components/store/StoreToolbar";
import FiltersBar from "@/components/store/FiltersBar";
import ProductCard from "@/components/store/ProductCard";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await getProducts();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Toolbar: search, sort, tabs */}
      <StoreToolbar />

      {/* Filters */}
      <FiltersBar />

      {/* Products */}
      {products.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            opacity: 0.6,
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>
            No products found
          </h3>
          <p>Try adjusting filters or check back later.</p>
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
