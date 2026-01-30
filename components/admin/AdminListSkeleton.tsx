export default function AdminListSkeleton() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="card"
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
          }}
        >
          {/* Image placeholder */}
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 10,
              background: "#e5e5e5",
              flexShrink: 0,
            }}
          />

          {/* Text placeholder */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 14,
                width: "60%",
                background: "#e5e5e5",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                height: 12,
                width: "40%",
                background: "#e5e5e5",
                borderRadius: 6,
                marginTop: 6,
              }}
            />
          </div>

          {/* Price placeholder */}
          <div
            style={{
              height: 14,
              width: 50,
              background: "#e5e5e5",
              borderRadius: 6,
            }}
          />
        </div>
      ))}
    </div>
  );
}
