"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { addressesApi } from "@/lib/api";
import type { Address } from "@/lib/types";
import toast from "react-hot-toast";

/* ================================================================
   TYPES
================================================================ */
type AddressFormData = {
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postal_code: string;
};

const EMPTY_FORM: AddressFormData = {
  label: "",
  full_name: "",
  phone: "",
  address: "",
  city: "",
  district: "",
  postal_code: "",
};

/* ================================================================
   MAIN PAGE
================================================================ */
export default function AddressesPage() {
  const router  = useRouter();
  const user    = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const logout  = useAuth((s) => s.logout);

  const [addresses, setAddresses]             = useState<Address[]>([]);
  const [addrLoading, setAddrLoading]         = useState(false);
  const [addrError, setAddrError]             = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal]             = useState(false);
  const [editingAddr, setEditingAddr]         = useState<Address | null>(null);
  const [form, setForm]                       = useState<AddressFormData>(EMPTY_FORM);
  const [saving, setSaving]                   = useState(false);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  /* ---- Load addresses on mount ---- */
  useEffect(() => {
    if (user) fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchAddresses() {
    setAddrLoading(true);
    setAddrError(null);
    try {
      const data = (await addressesApi.list()) as Address[];
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      setAddrError("Failed to load addresses. Please try again.");
    } finally {
      setAddrLoading(false);
    }
  }

  /* ---- Modal helpers ---- */
  function openAdd() {
    setEditingAddr(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(addr: Address) {
    setEditingAddr(addr);
    setForm({
      label:       addr.label       ?? "",
      full_name:   addr.full_name,
      phone:       addr.phone,
      address:     addr.address,
      city:        addr.city,
      district:    addr.district    ?? "",
      postal_code: addr.postal_code ?? "",
    });
    setShowModal(true);
  }

  function setField(key: keyof AddressFormData, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  /* ---- Save (create or update) ---- */
  async function handleSave() {
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim()) {
      toast.error("Full name, phone, address and city are required.");
      return;
    }

    setSaving(true);
    try {
      // Backend AddressCreate schema (from OpenAPI):
      // label, full_name, phone, address, city, district, postal_code
      const payload = {
        label:       form.label || "Home",
        full_name:   form.full_name.trim(),
        phone:       form.phone.trim(),
        address:     form.address.trim(),
        city:        form.city.trim(),
        district:    form.district.trim() || undefined,
        postal_code: form.postal_code.trim() || undefined,
      };

      if (editingAddr) {
        await addressesApi.update(editingAddr.id, payload as any);
        toast.success("Address updated!");
      } else {
        await addressesApi.create(payload as any);
        toast.success("Address saved!");
      }

      setShowModal(false);
      await fetchAddresses();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save address.");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Delete ---- */
  async function handleDelete(addr: Address) {
    if (!confirm(`Delete "${addr.label ?? addr.full_name}"?`)) return;
    setDeletingId(addr.id);
    try {
      await addressesApi.delete(addr.id);
      toast.success("Address deleted.");
      setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
    } catch {
      toast.error("Failed to delete address.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---- Set default ---- */
  async function handleSetDefault(addr: Address) {
    if (addr.is_default) return;
    setSettingDefaultId(addr.id);
    try {
      await addressesApi.setDefault(addr.id);
      toast.success("Default address updated.");
      await fetchAddresses();
    } catch {
      toast.error("Failed to set default.");
    } finally {
      setSettingDefaultId(null);
    }
  }

  function handleLogout() {
    logout();
    toast.success("Logged out");
    router.replace("/login");
  }

  /* ---- Guard states ---- */
  if (loading) {
    return <div style={{ padding: 40, fontWeight: 700 }}>Loading addresses…</div>;
  }
  if (!user) return null;

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div style={{ maxWidth: 900 }}>
      {/* ---- Page header ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Your Addresses</h1>
        <button onClick={openAdd} style={btnPrimary}>
          + Add New Address
        </button>
      </div>

      {/* ---- Error banner ---- */}
      {addrError && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "#fff1f2", border: "1px solid #fca5a5", color: "#b91c1c", marginBottom: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 12 }}>
          {addrError}
          <button onClick={fetchAddresses} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontWeight: 800, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      {/* ---- Loading skeleton ---- */}
      {addrLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ height: 114, borderRadius: 16, background: "linear-gradient(90deg,#f1f0ee 0%,#e4e2de 50%,#f1f0ee 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
        </div>
      )}

      {/* ---- Address list / empty ---- */}
      {!addrLoading && !addrError && (
        addresses.length === 0 ? (
          <div style={{ padding: "48px 32px", borderRadius: 18, background: "#fff", boxShadow: "0 14px 40px rgba(0,0,0,.08)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
            <p style={{ opacity: 0.65, marginBottom: 24, fontSize: 16, margin: "0 0 24px" }}>
              You haven't added any delivery addresses yet.
            </p>
            <button onClick={openAdd} style={btnPrimary}>
              Add your first address
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={() => openEdit(addr)}
                onDelete={() => handleDelete(addr)}
                onSetDefault={() => handleSetDefault(addr)}
                isDeleting={deletingId === addr.id}
                isSettingDefault={settingDefaultId === addr.id}
              />
            ))}
          </div>
        )
      )}

      {/* ---- Logout ---- */}
      <button onClick={handleLogout} style={{ marginTop: 36, background: "transparent", border: "none", color: "#b00020", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
        Log out
      </button>

      {/* ================================================================
          MODAL — Add / Edit address
      ================================================================ */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            {/* Modal header */}
            <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
                {editingAddr ? "Edit Address" : "Add New Address"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Label */}
              <div>
                <label style={formLabel}>Label <span style={{ color: "#94a3b8", fontWeight: 400 }}>(e.g. Home, Work)</span></label>
                <input value={form.label} onChange={(e) => setField("label", e.target.value)} placeholder="Home" style={formInput} />
              </div>

              {/* Full name */}
              <div>
                <label style={formLabel}>Full Name <Req /></label>
                <input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} placeholder="Karabo Mokoena" style={formInput} />
              </div>

              {/* Phone */}
              <div>
                <label style={formLabel}>Phone Number <Req /></label>
                <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+266 5800 0000" style={formInput} />
              </div>

              {/* Address */}
              <div>
                <label style={formLabel}>Street Address <Req /></label>
                <input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="123 Main Street" style={formInput} />
              </div>

              {/* City + District */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={formLabel}>City <Req /></label>
                  <input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Maseru" style={formInput} />
                </div>
                <div>
                  <label style={formLabel}>District</label>
                  <input value={form.district} onChange={(e) => setField("district", e.target.value)} placeholder="Maseru District" style={formInput} />
                </div>
              </div>

              {/* Postal code */}
              <div>
                <label style={formLabel}>Postal Code</label>
                <input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} placeholder="100" style={formInput} />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => setShowModal(false)} style={btnSecondary} disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSave} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                  {saving ? "Saving…" : editingAddr ? "Save Changes" : "Add Address"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   ADDRESS CARD
================================================================ */
function AddressCard({
  address, onEdit, onDelete, onSetDefault, isDeleting, isSettingDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
}) {
  return (
    <div style={{
      padding: "20px 24px", borderRadius: 16,
      background: "#fff",
      border: address.is_default ? "2px solid #0033a0" : "1px solid #e8e4df",
      boxShadow: address.is_default ? "0 0 0 4px rgba(0,51,160,0.06)" : "0 2px 8px rgba(0,0,0,0.04)",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
    }}>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{address.label ?? "Address"}</span>
          {address.is_default && (
            <span style={{ fontSize: 10, fontWeight: 800, background: "#0033a0", color: "#fff", borderRadius: 99, padding: "2px 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Default
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600 }}>{address.full_name}</div>
          <div>{address.phone}</div>
          <div>{address.address}</div>
          <div>{[address.city, address.district, address.postal_code].filter(Boolean).join(", ")}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={btnSmallOutline}>Edit</button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            style={{ ...btnSmallOutline, borderColor: "#fca5a5", color: "#dc2626", opacity: isDeleting ? 0.6 : 1 }}
          >
            {isDeleting ? "…" : "Delete"}
          </button>
        </div>
        {!address.is_default && (
          <button
            onClick={onSetDefault}
            disabled={isSettingDefault}
            style={{ fontSize: 12, fontWeight: 700, background: "none", border: "none", color: "#0033a0", cursor: "pointer", opacity: isSettingDefault ? 0.6 : 1, padding: 0 }}
          >
            {isSettingDefault ? "Setting…" : "Set as default"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   SMALL HELPERS
================================================================ */
function Req() {
  return <span style={{ color: "#dc2626" }}>*</span>;
}

/* ---- Styles ---- */
const btnPrimary: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 10, border: "none",
  fontWeight: 800, background: "#111", color: "#fff",
  cursor: "pointer", fontSize: 14,
};

const btnSecondary: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 10,
  border: "1.5px solid #e2e0db", background: "#fff",
  color: "#374151", fontWeight: 700, cursor: "pointer", fontSize: 14,
};

const btnSmallOutline: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 8,
  border: "1.5px solid #e2e0db", background: "#fff",
  color: "#374151", fontWeight: 700, cursor: "pointer", fontSize: 13,
};

const formLabel: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "#374151", marginBottom: 6, letterSpacing: 0.3,
};

const formInput: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1.5px solid #e2e0db", background: "#fafaf8",
  fontSize: 14, color: "#0f172a", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s",
};