"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import { useState } from "react";
import toast from "react-hot-toast";

/*
  SUPPORT PAGE — USER
  -------------------
  Backend SupportTicket model exists,
  but user-facing APIs are not wired yet.

  This page is intentionally read-only and honest.
  No fake ticket creation.
  No placeholder API calls.
*/

export default function SupportPage() {
  // Placeholder state for user tickets
  const [tickets, setTickets] = useState([
    { id: 1, title: "Payment issue", status: "open", description: "I have an issue with my recent payment." },
    { id: 2, title: "Delivery delay", status: "in_progress", description: "My order has been delayed." },
    { id: 3, title: "Account recovery", status: "resolved", description: "I lost access to my account, it has been recovered." },
  ]);

  // State for new ticket form
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");

  // Handler for creating a new ticket (this is just a placeholder function)
  const handleCreateTicket = () => {
    if (!newTicketTitle || !newTicketDescription) {
      toast.error("Please fill in both fields.");
      return;
    }

    const newTicket = {
      id: tickets.length + 1,
      title: newTicketTitle,
      status: "open", // Default status is 'open'
      description: newTicketDescription,
    };

    setTickets([...tickets, newTicket]);
    setNewTicketTitle("");
    setNewTicketDescription("");
    toast.success("Ticket created successfully!");
  };

  return (
    <RequireAuth>
      <div style={{ maxWidth: 800, display: "grid", gap: 24 }}>
        {/* HEADER */}
        <header>
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>
            Support
          </h1>
          <p style={{ marginTop: 6, opacity: 0.6 }}>
            Get help with your orders or account
          </p>
        </header>

        {/* CONTENT */}
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 22,
            padding: 24,
            display: "grid",
            gap: 20,
          }}
        >
          {/* Ticket Creation Form */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>
              Create a Support Ticket
            </h3>
            <input
              type="text"
              placeholder="Ticket Title"
              value={newTicketTitle}
              onChange={(e) => setNewTicketTitle(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", marginBottom: "12px" }}
            />
            <textarea
              placeholder="Ticket Description"
              value={newTicketDescription}
              onChange={(e) => setNewTicketDescription(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", height: "100px" }}
            />
            <button
              onClick={handleCreateTicket}
              style={{
                marginTop: "12px",
                padding: "10px 15px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Create Ticket
            </button>
          </div>

          {/* Ticket List */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>Your Tickets</h3>
            {tickets.length === 0 ? (
              <p>No tickets found.</p>
            ) : (
              <ul>
                {tickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    style={{
                      padding: "10px",
                      marginBottom: "12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <h4 style={{ fontWeight: 700 }}>{ticket.title}</h4>
                    <p>{ticket.description}</p>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          ticket.status === "open"
                            ? "#fbbf24"
                            : ticket.status === "in_progress"
                            ? "#3b82f6"
                            : "#10b981",
                        color: "white",
                      }}
                    >
                      {ticket.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}
