"use client";

import { useEffect, useState } from "react";
import { adminUsersAdvancedApi } from "@/lib/api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    adminUsersAdvancedApi.listSessions(false).then(setSessions);
  }, []);

  async function deleteSession(id: string) {
    await adminUsersAdvancedApi.deleteSession(id);
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Active Sessions
      </h1>

      {sessions.map((s) => (
        <div key={s.id} style={card}>
          {s.user_email}
          <button onClick={() => deleteSession(s.id)}>Kill</button>
        </div>
      ))}
    </div>
  );
}

const card = {
  display: "flex",
  justifyContent: "space-between",
  background: "#fff",
  padding: 12,
  marginTop: 10,
  borderRadius: 8,
};
