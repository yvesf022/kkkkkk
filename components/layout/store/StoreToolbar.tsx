"use client";

export type SortMode = "featured" | "priceLow" | "priceHigh" | "rating";

export type Filters = {
  q: string;
  minRating: number;
  priceMax: number;
  onlyDiscount: boolean;
};

export default function StoreToolbar({
  filters,
  setFilters,
  sort,
  setSort,
}: {
  filters: Filters;
  setFilters: (v: Filters) => void;
  sort: SortMode;
  setSort: (v: SortMode) => void;
}) {
  return (
    <div className="glass neon-border" style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <div className="neon-text" style={{ fontSize: 22, fontWeight: 1000 }}>
            Products
          </div>
          <div style={{ color: "rgba(234,246,255,0.72)", fontSize: 13 }}>
            Search, filter and sort in real time
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="pill"
            placeholder="Search products..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            style={{
              border: "1px solid rgba(73,215,255,0.20)",
              outline: "none",
              color: "white",
              minWidth: 240,
            }}
          />

          <select
            className="pill"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            style={{ border: "1px solid rgba(73,215,255,0.20)", color: "white", outline: "none" }}
          >
            <option value="featured">Sort: Featured</option>
            <option value="priceLow">Price: Low → High</option>
            <option value="priceHigh">Price: High → Low</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      <div className="hr" style={{ margin: "14px 0" }} />

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="pill" style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(234,246,255,0.70)" }}>
              Minimum Rating: {filters.minRating.toFixed(1)}+
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
            />
          </div>

          <div className="pill" style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(234,246,255,0.70)" }}>
              Price Max: ₹{filters.priceMax}
            </div>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={filters.priceMax}
              onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
            />
          </div>

          <label className="pill" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={filters.onlyDiscount}
              onChange={(e) => setFilters({ ...filters, onlyDiscount: e.target.checked })}
            />
            <span style={{ fontWeight: 900, color: "rgba(234,246,255,0.8)" }}>
              Only Discounted Products
            </span>
          </label>
        </div>

        <button
          className="btn"
          onClick={() => setFilters({ q: "", minRating: 0, priceMax: 5000, onlyDiscount: false })}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
