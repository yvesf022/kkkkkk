"use client";

import { useState } from "react";

interface Props {
  images: string[];
}

export default function ProductGallery({ images }: Props) {
  const [active, setActive] = useState(0);

  if (!images?.length) return null;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Main Image with Zoom */}
      <div
        style={{
          borderRadius: 28,
          overflow: "hidden",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          position: "relative",
          cursor: "zoom-in",
        }}
      >
        <div
          style={{
            height: 520,
            background: `url(${images[active]}) center/cover`,
            transition: "transform 0.4s ease",
          }}
          onMouseMove={(e) => {
            const target = e.currentTarget;
            target.style.transform = "scale(1.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        />
      </div>

      {/* Thumbnails */}
      <div style={{ display: "flex", gap: 12 }}>
        {images.map((img, i) => (
          <div
            key={i}
            onClick={() => setActive(i)}
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              border:
                active === i
                  ? "2px solid var(--primary)"
                  : "1px solid #e5e7eb",
              background: `url(${img}) center/cover`,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
