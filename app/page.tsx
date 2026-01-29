export default function HomePage() {
  return (
    <div style={{ display: "grid", gap: 48 }}>
      {/* HERO */}
      <section
        style={{
          display: "grid",
          gap: 18,
          maxWidth: 720,
        }}
      >
        <h1 style={{ fontSize: 40, fontWeight: 900 }}>
          Karabo’s Boutique
        </h1>

        <p style={{ fontSize: 18, opacity: 0.75 }}>
          Lesotho’s premium online destination for beauty, fashion,
          and accessories.
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <a href="/store" className="btn btnPrimary">
            Explore store →
          </a>

          <a href="/store" className="btn btnGhost">
            Browse categories
          </a>
        </div>
      </section>

      {/* FEATURED */}
      <section style={{ display: "grid", gap: 18 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900 }}>
          Featured products
        </h2>

        <a href="/store" className="btn btnTech" style={{ width: "fit-content" }}>
          View all →
        </a>

        <p style={{ opacity: 0.6 }}>
          Products will appear here soon.
        </p>
      </section>
    </div>
  );
}
