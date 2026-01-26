type Props = {
  paymentStatus: string;
  shippingStatus: string;
  trackingNumber?: string | null;
};

const STEPS = [
  { key: "on_hold", label: "Order Placed" },
  { key: "payment_submitted", label: "Payment Submitted" },
  { key: "payment_received", label: "Payment Received" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default function OrderTimeline({
  paymentStatus,
  shippingStatus,
  trackingNumber,
}: Props) {
  function isStepActive(step: string) {
    if (step === "on_hold") return true;
    if (step === "payment_submitted")
      return paymentStatus !== "on_hold";
    if (step === "payment_received")
      return paymentStatus === "payment_received";
    if (step === "shipped")
      return shippingStatus === "shipped" || shippingStatus === "delivered";
    if (step === "delivered")
      return shippingStatus === "delivered";
    return false;
  }

  return (
    <section className="card" style={{ marginTop: 20 }}>
      <h3 style={{ fontWeight: 900 }}>Order Status</h3>

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 16,
        }}
      >
        {STEPS.map((step) => {
          const active = isStepActive(step.key);

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: active ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: active ? "#22c55e" : "#cbd5e1",
                }}
              />
              <div style={{ fontWeight: 700 }}>{step.label}</div>
            </div>
          );
        })}
      </div>

      {trackingNumber && (
        <div
          style={{
            marginTop: 16,
            fontWeight: 700,
          }}
        >
          Tracking Number:{" "}
          <span style={{ fontWeight: 900 }}>
            {trackingNumber}
          </span>
        </div>
      )}
    </section>
  );
}
