"use client";

import { useEffect, useState } from "react";

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stores`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then(setStores);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Stores
      </h1>

      {stores.map((s) => (
        <div key={s.id} style={card}>
          {s.name}
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
