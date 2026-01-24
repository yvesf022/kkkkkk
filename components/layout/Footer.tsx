export default function Footer() {
  return (
    <footer style={{ padding: "18px 0 26px" }}>
      <div
        className="container glass"
        style={{
          padding: "14px 16px",
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 0.15,
            color: "rgba(22, 16, 24, 0.75)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>
            © {new Date().getFullYear()}{" "}
            <span style={{ color: "rgba(255, 78, 162, 0.95)" }}>
              Karabo’s Online Store
            </span>
          </span>

          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background:
                "linear-gradient(180deg, rgba(255, 188, 222, 0.95), rgba(255, 78, 162, 0.70))",
              boxShadow: "0 12px 22px rgba(255, 78, 162, 0.14)",
            }}
          />

          <span style={{ fontWeight: 1000, color: "rgba(22,16,24,0.62)" }}>
            All Rights Reserved.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            fontSize: 13,
            fontWeight: 900,
            color: "rgba(22, 16, 24, 0.62)",
            flexWrap: "wrap",
          }}
        >
          <span
            className="pill"
            style={{
              padding: "8px 12px",
              background:
                "linear-gradient(180deg, rgba(255, 188, 222, 0.30), rgba(255,255,255,0.70))",
              borderColor: "rgba(255, 78, 162, 0.16)",
            }}
          >
            Privacy
          </span>

          <span className="pill" style={{ padding: "8px 12px" }}>
            Terms
          </span>

          <span
            className="pill"
            style={{
              padding: "8px 12px",
              borderColor: "rgba(255, 78, 162, 0.18)",
              background:
                "linear-gradient(180deg, rgba(255, 162, 212, 0.28), rgba(255,255,255,0.72))",
            }}
          >
            Support
          </span>
        </div>
      </div>
    </footer>
  );
}
