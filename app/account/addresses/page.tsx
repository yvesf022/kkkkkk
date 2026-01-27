"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getMyAddresses,
  createAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/api";

type Address = {
  id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  async function loadAddresses() {
    try {
      const data = await getMyAddresses();
      setAddresses(data);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  async function addAddress() {
    if (
      !form.full_name ||
      !form.phone ||
      !form.address_line_1 ||
      !form.city ||
      !form.state ||
      !form.postal_code ||
      !form.country
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setAdding(true);
    try {
      await createAddress(form);
      toast.success("Address added");
      setForm({
        full_name: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
      });
      loadAddresses();
    } catch {
      toast.error("Failed to add address");
    } finally {
      setAdding(false);
    }
  }

  async function makeDefault(id: string) {
    try {
      await setDefaultAddress(id);
      toast.success("Default address updated");
      loadAddresses();
    } catch {
      toast.error("Failed to update default address");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this address? This cannot be undone.")) return;

    try {
      await deleteAddress(id);
      toast.success("Address removed");
      loadAddresses();
    } catch {
      toast.error("Failed to delete address");
    }
  }

  if (loading) return <p>Loading addresses…</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Addresses</h1>
      <p style={{ marginTop: 6, opacity: 0.6 }}>
        Manage your delivery addresses
      </p>

      {/* LIST */}
      <section style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {addresses.length === 0 ? (
          <div
            style={{
              padding: 24,
              borderRadius: 18,
              background: "#f8fafc",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            No addresses saved yet.
          </div>
        ) : (
          addresses.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 20,
                borderRadius: 18,
                border: "1px solid #e5e7eb",
                background: a.is_default ? "#f0f9ff" : "#ffffff",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                {a.full_name}
                {a.is_default && (
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#0369a1",
                    }}
                  >
                    (Default)
                  </span>
                )}
              </div>

              <div style={{ opacity: 0.7 }}>{a.phone}</div>

              <div style={{ marginTop: 6 }}>
                {a.address_line_1}
                {a.address_line_2 && <>, {a.address_line_2}</>}
                <br />
                {a.city}, {a.state}
                <br />
                {a.postal_code}, {a.country}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                {!a.is_default && (
                  <button
                    className="btn btnGhost"
                    onClick={() => makeDefault(a.id)}
                  >
                    Set as default
                  </button>
                )}

                <button
                  className="btn btnDanger"
                  onClick={() => remove(a.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ADD NEW */}
      <section
        style={{
          marginTop: 32,
          padding: 24,
          borderRadius: 22,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 900 }}>
          Add new address
        </h2>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 14,
          }}
        >
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) =>
              setForm({ ...form, full_name: e.target.value })
            }
          />
          <input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />
          <input
            placeholder="Address line 1"
            value={form.address_line_1}
            onChange={(e) =>
              setForm({ ...form, address_line_1: e.target.value })
            }
          />
          <input
            placeholder="Address line 2 (optional)"
            value={form.address_line_2}
            onChange={(e) =>
              setForm({ ...form, address_line_2: e.target.value })
            }
          />
          <input
            placeholder="City"
            value={form.city}
            onChange={(e) =>
              setForm({ ...form, city: e.target.value })
            }
          />
          <input
            placeholder="State / Region"
            value={form.state}
            onChange={(e) =>
              setForm({ ...form, state: e.target.value })
            }
          />
          <input
            placeholder="Postal code"
            value={form.postal_code}
            onChange={(e) =>
              setForm({ ...form, postal_code: e.target.value })
            }
          />
          <input
            placeholder="Country"
            value={form.country}
            onChange={(e) =>
              setForm({ ...form, country: e.target.value })
            }
          />
        </div>

        <button
          onClick={addAddress}
          disabled={adding}
          className="btn btnPrimary"
          style={{ marginTop: 18 }}
        >
          {adding ? "Saving…" : "Add address"}
        </button>
      </section>
    </div>
  );
}
