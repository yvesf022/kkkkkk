"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function ReportsPage() {
  const [deadStock, setDeadStock] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getDeadStock().then(setDeadStock);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Enterprise Reports
      </h1>

      {deadStock.map((p) => (
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
};
