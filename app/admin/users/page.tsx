"use client";

import { useEffect, useState } from "react";
import { adminUsersAdvancedApi } from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  async function disable(id: string) {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}/disable`,
      { method: "POST", credentials: "include" }
    );
    location.reload();
  }

  async function hardDelete(id: string) {
    await adminUsersAdvancedApi.hardDelete(id);
    location.reload();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        User Management
      </h1>

      {users.map((u) => (
        <div key={u.id} style={card}>
          {u.email}
          <div>
            <button onClick={() => disable(u.id)}>Disable</button>
            <button onClick={() => hardDelete(u.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const card = {
  display: "flex",
  justifyContent: "space-between",
  padding: 12,
  background: "#fff",
  marginTop: 10,
  borderRadius: 8,
};
