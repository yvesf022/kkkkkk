"use client";

import { useState } from "react";
import toast from "react-hot-toast";

/*
  NOTE:
  Backend endpoints for addresses are not implemented yet.
  This page is UI-complete and ready to wire once APIs exist.
*/

type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading] = useState(false);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Addresses
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Manage your delivery addresses
        </p>
      </header>

      {/* ACTION */}
      <div style={{ marginTop: 24 }}>
        <button
          className="btn btnTech"
          onClick={() =>
            toast("Add address form will be available soon")
          }
        >
          + Add New Address
        </button>
      </div>

      {/* CONTENT */}
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {loading && <p>Loading addresses…</p>}

        {!loading && addresses.length === 0 && (
          <div
            style={{
              padding: 24,
              borderRadius: 20,
              border: "1px dashed #cbd5f5",
              background: "#f8fafc",
              opacity: 0.8,
            }}
          >
            <p>You haven’t added any addresses yet.</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              Add a delivery address to speed up checkout.
            </p>
          </div>
        )}

        {addresses.map((a) => (
          <div
            key={a.id}
            style={{
              padding: 20,
              borderRadius: 20,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              display: "grid",
              gap: 10,
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                {a.label}
              </div>
              {a.is_default && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "#22c55e",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  Default
                </span>
              )}
            </div>

            {/* BODY */}
            <div style={{ fontSize: 14 }}>
              <b>{a.name}</b>
              <br />
              {a.address}
              <br />
              {a.city}, {a.state} – {a.pincode}
              <br />
              Phone: {a.phone}
            </div>

            {/* ACTIONS */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                className="btn btnGhost"
                onClick={() =>
                  toast("Edit address coming soon")
                }
              >
                Edit
              </button>
              <button
                className="btn btnGhost"
                onClick={() =>
                  toast("Delete address coming soon")
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
