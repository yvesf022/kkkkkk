"use client";

export default function Skeleton({
  height = 14,
  radius = 14,
}: {
  height?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        border: "1px solid rgba(73,215,255,0.12)",
        background:
          "linear-gradient(90deg, rgba(73,215,255,0.06), rgba(73,215,255,0.12), rgba(73,215,255,0.06))",
        backgroundSize: "220% 100%",
        animation: "kyShimmer 1.1s ease-in-out infinite",
        boxShadow: "0 0 22px rgba(73,215,255,0.06)",
      }}
    />
  );
}
