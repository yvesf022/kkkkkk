"use client";

import { useEffect, useState } from "react";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/logs`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then(setLogs);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Audit Logs
      </h1>

      {logs.map((l) => (
        <div key={l.id} style={card}>
          {l.action} — {l.entity_type}
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
