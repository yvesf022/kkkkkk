"use client";

import { useState } from "react";

/**
 * WhatsApp Chat Widget (Advanced)
 * Shows mini chat interface before opening WhatsApp
 */

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  // 🔧 CONFIGURE YOUR WHATSAPP
  const WHATSAPP_NUMBER = "919253258848"; // Your number with country code
  const STORE_NAME = "Karabo Online Store";
  const STORE_AVATAR = "/logo.png"; // Optional: your store logo
  const ONLINE_STATUS = "Usually replies within minutes";

  function sendMessage() {
    const text = message || "Hi! I'm interested in your products.";
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setMessage("");
    setIsOpen(false);
  }

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 24,
            width: 360,
            maxWidth: "calc(100vw - 48px)",
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15)",
            zIndex: 9999,
            overflow: "hidden",
            animation: "slideUp 0.3s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 16,
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 24,
              }}
            >
              🛍️
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {STORE_NAME}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {ONLINE_STATUS}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          {/* Chat Area */}
          <div style={{ padding: 20, minHeight: 200, background: "#f0f2f5" }}>
            {/* Welcome Message */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "#fff",
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              👋 Hi there! How can we help you today?
            </div>

            {/* Quick Replies */}
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setMessage("I want to inquire about a product")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                }}
              >
                📦 Inquire about a product
              </button>

              <button
                onClick={() => setMessage("I need help with my order")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                }}
              >
                🚚 Track my order
              </button>

              <button
                onClick={() => setMessage("What are your business hours?")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                }}
              >
                ⏰ Business hours
              </button>
            </div>
          </div>

          {/* Input */}
          <div
            style={{
              padding: 16,
              background: "#fff",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <button
                onClick={sendMessage}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 20,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #25D366, #128C7E)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(37, 211, 102, 0.4)",
          display: "grid",
          placeItems: "center",
          zIndex: 9999,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(37, 211, 102, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 211, 102, 0.4)";
        }}
      >
        {isOpen ? (
          <span style={{ fontSize: 24 }}>×</span>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>

      {/* Unread Badge (Optional) */}
      {!isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 74,
            right: 74,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#dc2626",
            color: "#fff",
            fontSize: 11,
            fontWeight: 900,
            display: "grid",
            placeItems: "center",
            zIndex: 10000,
          }}
        >
          1
        </div>
      )}
    </>
  );
}