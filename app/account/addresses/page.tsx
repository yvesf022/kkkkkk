"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

const FF = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";
const BORDER = "#E2E8F0";
const SUCCESS = "#10B981";

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  district?: string;
  country: string;
  postal_code?: string;
  is_default: boolean;
};

type AddressForm = Omit<Address, "id" | "is_default">;

const EMPTY_FORM: AddressForm = {
  label: "",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  district: "",
  country: "",
  postal_code: "",
};

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ animation: "aspin .7s linear infinite" }}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
      <path d="M10 2a8 8 0 018 8" stroke={ACCENT} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function FormField({
  label, value, onChange, placeholder, required, type = "text"
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 5, fontFamily: FF, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 13px", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, fontFamily: FF, color: BRAND, outline: "none", background: "#fff", boxSizing: "border-box", transition: "border-color .15s" }}
        onFocus={e => (e.target.style.borderColor = ACCENT)}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
    </div>
  );
}

export default function AccountAddressesPage() {
  const router = useRouter();

  /**
   * NOTE: Backend endpoints for addresses are not yet implemented.
   * The UI is fully functional — state management is wired, CRUD works locally.
   * To activate: connect the api calls in the handlers below.
   */

  // Demo state (will be replaced by API fetch)
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 ?? "",
      city: addr.city,
      district: addr.district ?? "",
      country: addr.country,
      postal_code: addr.postal_code ?? "",
    });
    setEditingId(addr.id);
    setShowForm(true);
  }

  function updateField(key: keyof AddressForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.phone.trim() || !form.address_line1.trim() || !form.city.trim() || !form.country.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      // TODO: Replace with API call
      // if (editingId) await addressApi.update(editingId, form);
      // else await addressApi.create(form);

      if (editingId) {
        setAddresses(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
        toast.success("Address updated");
      } else {
        const newAddr: Address = {
          ...form,
          id: Date.now().toString(),
          is_default: addresses.length === 0,
        };
        setAddresses(prev => [...prev, newAddr]);
        toast.success("Address added");
      }
      setShowForm(false);
      setEditingId(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      // TODO: await addressApi.delete(id);
      setAddresses(prev => {
        const updated = prev.filter(a => a.id !== id);
        // If deleted was default, make first item default
        if (updated.length > 0 && !updated.some(a => a.is_default)) {
          updated[0].is_default = true;
        }
        return updated;
      });
      toast.success("Address removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove address");
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  }

  async function handleSetDefault(id: string) {
    // TODO: await addressApi.setDefault(id);
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
    toast.success("Default address updated");
  }

  return (
    <div style={{ fontFamily: FF, maxWidth: 720, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes aspin { to { transform: rotate(360deg); } }
        @keyframes afade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .addr-card { transition: box-shadow .2s, transform .18s; }
        .addr-card:hover { box-shadow: 0 6px 24px rgba(37,99,235,.1); transform: translateY(-1px); }
        input:focus { border-color: ${ACCENT} !important; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Account</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: "0 0 6px" }}>Delivery Addresses</h1>
            <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
              {addresses.length === 0
                ? "Add an address to speed up checkout."
                : `${addresses.length} saved address${addresses.length !== 1 ? "es" : ""}`}
            </p>
          </div>
          {addresses.length > 0 && (
            <button onClick={openAdd}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer", transition: "opacity .15s" }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseOut={e => (e.currentTarget.style.opacity = "1")}>
              <span>+</span> Add Address
            </button>
          )}
        </div>
      </div>

      {/* ── Trust note ── */}
      <div style={{ padding: "14px 18px", borderRadius: 14, background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>📦</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", margin: "0 0 3px" }}>Why addresses matter</p>
          <p style={{ fontSize: 13, color: "#3B82F6", margin: 0, lineHeight: 1.6 }}>
            After payment verification, your order ships to the selected address. Ensure phone and location details are accurate to avoid delays.
          </p>
        </div>
      </div>

      {/* ── Address list ── */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0", color: "#94A3B8" }}>
          <Spinner size={24} />
        </div>
      )}

      {!loading && addresses.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 40px", borderRadius: 18, border: `2px dashed ${BORDER}`, background: "#FAFBFC", animation: "afade .3s ease" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📍</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: BRAND, margin: "0 0 8px" }}>No delivery addresses yet</h3>
          <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px", lineHeight: 1.6 }}>
            Add a delivery address so we can ship your orders without delay once payment is confirmed.
          </p>
          <button onClick={openAdd}
            style={{ padding: "12px 28px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer" }}>
            Add your first address
          </button>
        </div>
      )}

      {!loading && addresses.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {addresses.map((addr, i) => (
            <div key={addr.id} className="addr-card"
              style={{ background: "#fff", border: `1px solid ${addr.is_default ? ACCENT : BORDER}`, borderRadius: 16, overflow: "hidden", animation: `afade .3s ease ${i * 0.05}s both` }}>

              {/* Default header bar */}
              {addr.is_default && (
                <div style={{ padding: "6px 20px", background: ACCENT, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.08L6 8.1 3.22 9.53l.53-3.08L1.5 4.25l3.1-.45L6 1z" fill="#fff"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>Default Address</span>
                </div>
              )}

              <div style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: BRAND, margin: "0 0 2px", fontFamily: FF }}>{addr.label || "Home"}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: 0 }}>{addr.full_name}</p>
                  </div>
                  {!addr.is_default && (
                    <button onClick={() => handleSetDefault(addr.id)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${BORDER}`, background: "#fff", color: "#64748B", fontSize: 12, fontWeight: 600, fontFamily: FF, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Set as default
                    </button>
                  )}
                </div>

                {/* Address grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginBottom: 16 }}>
                  {[
                    { icon: "📞", label: "Phone", val: addr.phone },
                    { icon: "🏘", label: "Street", val: [addr.address_line1, addr.address_line2].filter(Boolean).join(", ") },
                    { icon: "🏙", label: "City", val: [addr.city, addr.district].filter(Boolean).join(", ") },
                    { icon: "🌍", label: "Country", val: [addr.country, addr.postal_code].filter(Boolean).join(" · ") },
                  ].map(row => (
                    <div key={row.label}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {row.icon} {row.label}
                      </p>
                      <p style={{ fontSize: 13, color: "#475569", margin: 0, fontWeight: 500 }}>{row.val || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <button onClick={() => openEdit(addr)}
                    style={{ flex: 1, padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, fontFamily: FF, cursor: "pointer", transition: "background .15s" }}
                    onMouseOver={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseOut={e => (e.currentTarget.style.background = "#fff")}>
                    ✏ Edit
                  </button>
                  <button onClick={() => setShowDeleteConfirm(addr.id)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #FECDD3", background: "#FFF1F2", color: "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FF, cursor: "pointer" }}>
                    🗑 Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer actions ── */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
        <button onClick={() => router.push("/account/orders")}
          style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, fontFamily: FF, cursor: "pointer" }}>
          ← Back to Orders
        </button>
        <button onClick={() => router.push("/store")}
          style={{ padding: "10px 20px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: "pointer" }}>
          Continue Shopping
        </button>
      </div>

      {/* ══ Address Form Modal ══ */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(10,15,30,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" }}
          onClick={() => setShowForm(false)}>
          <div
            style={{ background: "#fff", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", animation: "afade .2s ease", boxShadow: "0 24px 64px rgba(0,0,0,.2)" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: BRAND, margin: 0, fontFamily: FF }}>
                {editingId ? "Edit Address" : "Add New Address"}
              </h2>
              <button onClick={() => setShowForm(false)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "#fff", color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <FormField label="Label" value={form.label} onChange={v => updateField("label", v)} placeholder="e.g. Home, Work, My apartment" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Full Name" value={form.full_name} onChange={v => updateField("full_name", v)} placeholder="Recipient name" required />
                <FormField label="Phone Number" value={form.phone} onChange={v => updateField("phone", v)} placeholder="+266 5xxx xxxx" required type="tel" />
              </div>

              <FormField label="Address Line 1" value={form.address_line1} onChange={v => updateField("address_line1", v)} placeholder="Street address, building name" required />
              <FormField label="Address Line 2" value={form.address_line2 ?? ""} onChange={v => updateField("address_line2", v)} placeholder="Apartment, floor, unit (optional)" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="City / Town" value={form.city} onChange={v => updateField("city", v)} placeholder="City" required />
                <FormField label="District / Region" value={form.district ?? ""} onChange={v => updateField("district", v)} placeholder="District (optional)" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Country" value={form.country} onChange={v => updateField("country", v)} placeholder="Country" required />
                <FormField label="Postal Code" value={form.postal_code ?? ""} onChange={v => updateField("postal_code", v)} placeholder="ZIP / Postal (optional)" />
              </div>
            </div>

            {/* Form actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: "12px 20px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {saving ? <><Spinner size={16} /> Saving…</> : editingId ? "Save Changes" : "Add Address"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "12px 20px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, fontFamily: FF, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm Modal ══ */}
      {showDeleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(10,15,30,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" }}
          onClick={() => setShowDeleteConfirm(null)}>
          <div
            style={{ background: "#fff", borderRadius: 20, padding: "32px", width: "100%", maxWidth: 400, animation: "afade .2s ease", boxShadow: "0 24px 64px rgba(0,0,0,.2)", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, margin: "0 0 8px", fontFamily: FF }}>Remove Address?</h3>
            <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px", lineHeight: 1.6 }}>
              This address will be permanently removed from your account.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleDelete(showDeleteConfirm)} disabled={deletingId === showDeleteConfirm}
                style={{ flex: 1, padding: "11px 16px", borderRadius: 10, background: "#DC2626", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {deletingId === showDeleteConfirm ? <Spinner size={14} /> : "Yes, Remove"}
              </button>
              <button onClick={() => setShowDeleteConfirm(null)}
                style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, fontFamily: FF, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}