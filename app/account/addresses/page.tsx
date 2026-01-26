"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getMyAddresses,
  createAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/api";

/* ======================
   TYPES
====================== */

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

/* ======================
   PAGE
====================== */

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  /* ---------- FORM STATE ---------- */
  const [form, setForm] = useState<Omit<Address, "id" | "is_default">>({
    full_name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  /* ======================
     LOAD ADDRESSES
  ======================= */

  async function loadAddresses() {
    try {
      const data = await getMyAddresses();
      setAddresses(data);
    } catch {
      toast.error("Failed to load addresses. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  /* ======================
     ACTIONS
  ======================= */

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
      toast.error("Please fill all required fields.");
      return;
    }

    setAdding(true);

    try {
      await createAddress(form);
      toast.success("Address added successfully.");
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
      toast.error("Failed to add address. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function makeDefault(id: string) {
    try {
      await setDefaultAddress(id);
      toast.success("Default address updated.");
      loadAddresses();
    } catch {
      toast.error("Failed to update default address. Please try again.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      await deleteAddress(id);
      toast.success("Address removed successfully.");
      loadAddresses();
    } catch {
      toast.error("Failed to delete address. Please try again.");
    }
  }

  /* ======================
     RENDER
  ======================= */

  if (loading) {
    return <p style={{ marginTop: 20 }}>Loading addresses…</p>;
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Addresses</h1>
      <p style={{ marginTop: 6, opacity: 0.6 }}>Manage your shipping addresses</p>

      {/* ======================
          LIST
      ======================= */}
      <section
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
        }}
      >
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
            No addresses saved yet. Please add an address to continue.
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{a.full_name}</div>
                  <div style={{ opacity: 0.7 }}>{a.phone}</div>
                  <div style={{ marginTop: 6 }}>
                    {a.address_line_1}
                    {a.address_line_2 && (
                      <>
                        <br />
                        {a.address_line_2}
                      </>
                    )}
                    <br />
                    {a.city}, {a.state}
                    <br />
                    {a.postal_code}, {a.country}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {!a.is_default && (
                    <button
                      className="btn btnGhost"
                      onClick={() => makeDefault(a.id)}
                      title="Set this address as default"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    className="btn btnDanger"
                    onClick={() => remove(a.id)}
                    title="Delete this address permanently"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ======================
          ADD NEW
      ======================= */}
      <section
        style={{
          marginTop: 32,
          padding: 24,
          borderRadius: 22,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 900 }}>Add new address</h2>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 14,
          }}
        >
          {Object.entries(form).map(([key, value]) => (
            <input
              key={key}
              placeholder={key.replaceAll("_", " ")}
              value={value}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]: e.target.value,
                })
              }
              title={`Enter your ${key.replaceAll("_", " ")}`}
            />
          ))}
        </div>

        <button
          onClick={addAddress}
          disabled={adding}
          className="btn btnTech"
          style={{ marginTop: 18 }}
          title={adding ? "Saving address..." : "Add your new address"}
        >
          {adding ? "Saving…" : "Add address"}
        </button>
      </section>
    </div>
  );
}
