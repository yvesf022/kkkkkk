"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ordersApi,
  adminOrdersAdvancedApi,
} from "@/lib/api";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [statusOverride, setStatusOverride] = useState("");

  async function load() {
    try {
      const data = await ordersApi.getAdminById(id);
      setOrder(data);

      const orderNotes = await adminOrdersAdvancedApi.getNotes(id);
      setNotes(orderNotes || [] as any || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function handleStatusOverride() {
    if (!statusOverride) return;
    await adminOrdersAdvancedApi.forceStatus(id, {
      status: statusOverride,
      reason: "Manual override from admin panel",
    });
    load();
  }

  async function handleRefund() {
    const amount = prompt("Refund amount?");
    if (!amount) return;

    await adminOrdersAdvancedApi.processRefund(id, {
      amount: Number(amount),
      reason: "Admin refund",
    });

    load();
  }

  async function handleCancel() {
    await adminOrdersAdvancedApi.forceStatus(id, {
      status: "cancelled",
      reason: "Cancelled by admin",
    });
    load();
  }

  async function handleAddNote() {
    if (!newNote) return;
    await adminOrdersAdvancedApi.addNote(id, {
      note: newNote,
      is_internal: true,
    });
    setNewNote("");
    load();
  }

  async function handleHardDelete() {
    if (!confirm("Hard delete this order?")) return;
    await adminOrdersAdvancedApi.hardDelete(id);
    alert("Order deleted");
  }

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 30 }}>

      <h1>Order #{order.id.slice(0, 8).toUpperCase()}</h1>

      {/* ORDER INFO */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Total:</strong> {order.total_amount}</p>
        <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Customer:</strong> {order.user?.email}</p>
      </div>

      {/* ITEMS */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Items</h3>
        {order.items?.map((item: any) => (
          <div key={item.id} style={{ marginBottom: 10 }}>
            {item.product_title} × {item.quantity}
          </div>
        ))}
      </div>

      {/* ACTIONS */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Admin Actions</h3>

        <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
          <select
            value={statusOverride}
            onChange={(e) => setStatusOverride(e.target.value)}
          >
            <option value="">Override Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button onClick={handleStatusOverride}>Apply</button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleRefund}>Refund</button>
          <button onClick={handleCancel}>Cancel</button>
          <button onClick={handleHardDelete} style={{ color: "red" }}>
            Hard Delete
          </button>
        </div>
      </div>

      {/* NOTES */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Internal Notes</h3>

        {notes.map((n) => (
          <div key={n.id} style={{ marginBottom: 10 }}>
            <div>{n.note}</div>
            <small>{new Date(n.created_at).toLocaleString()}</small>
          </div>
        ))}

        <div style={{ marginTop: 15 }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add internal note..."
            style={{ width: "100%", height: 80 }}
          />
          <button onClick={handleAddNote} style={{ marginTop: 10 }}>
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

