"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getLowStock().then(setLowStock);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Inventory Control
      </h1>

      {lowStock.map((p) => (
        <div key={p.id} style={card}>
          {p.title} — Stock: {p.stock}
        </div>
      ))}
    </div>
  );
}

const card = {
  background: "#fff",
  padding: 12,
  marginTop: 10,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};
