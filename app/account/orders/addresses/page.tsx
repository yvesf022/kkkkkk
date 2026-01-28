"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  is_default: boolean;
};

/**
 * NOTE:
 * Backend endpoints for addresses are not implemented yet.
 * This page is UI-complete and ready to wire once APIs exist.
 */

export default function OrderAddressesPage() {
  const router = useRouter();

  // Placeholder data until backend is wired
  const addresses: Address[] = [];

  function notReady() {
    toast("Address management will be available soon");
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        display: "grid",
        gap: 28,
      }}
    >
      {/* CONTEXT */}
      <div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Orders › Delivery addresses
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            marginTop: 6,
          }}
        >
          Delivery addresses
        </h1>
        <p
          style={{
            fontSize: 14,
            opacity: 0.6,
            marginTop: 6,
          }}
        >
          Addresses are used to deliver your orders after payment
          verification.
        </p>
      </div>

      {/* TRUST / DELIVERY NOTE */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: "#f8fafc",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        📦 <strong>Why this matters:</strong>  
        After you complete payment externally, our team verifies
        your order and ships it to your selected address.  
        <br />
        Make sure your phone number and location details are
        accurate to avoid delivery delays.
      </div>

      {/* ADD ADDRESS CTA */}
      <div>
        <button
          className="btn btnPrimary"
          onClick={notReady}
        >
          Add new address
        </button>
      </div>

      {/* ADDRESSES LIST */}
      <section
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        {addresses.length === 0 ? (
          <div
            style={{
              padding: 28,
              borderRadius: 22,
              background: "#f8fafc",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              No delivery addresses yet
            </div>
            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                opacity: 0.6,
              }}
            >
              Add a delivery address to ensure smooth shipping
              once your payment is confirmed.
            </p>

            <button
              className="btn btnTech"
              style={{ marginTop: 16 }}
              onClick={notReady}
            >
              Add your first address
            </button>
          </div>
        ) : (
          addresses.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 22,
                borderRadius: 22,
                background:
                  "linear-gradient(135deg,#ffffff,#f8fbff)",
                boxShadow:
                  "0 18px 50px rgba(15,23,42,0.12)",
                display: "grid",
                gap: 10,
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
                <div style={{ fontWeight: 900 }}>
                  {a.label}
                </div>

                {a.is_default && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "#dcfce7",
                      color: "#166534",
                    }}
                  >
                    Default
                  </span>
                )}
              </div>

              <div style={{ fontSize: 14 }}>
                <strong>{a.name}</strong> · {a.phone}
              </div>

              <div
                style={{
                  fontSize: 14,
                  opacity: 0.7,
                }}
              >
                {a.line1}, {a.city}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btnGhost"
                  onClick={notReady}
                >
                  Edit
                </button>
                <button
                  className="btn btnGhost"
                  onClick={notReady}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* FOOTER ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button
          className="btn btnGhost"
          onClick={() => router.push("/account/orders")}
        >
          Back to orders
        </button>

        <button
          className="btn btnPrimary"
          onClick={() => router.push("/store")}
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}
