"use client";

export default function DeliveryEstimate() {
  const today = new Date();

  // 3–7 day delivery window
  const minDays = 3;
  const maxDays = 7;

  const delivery = new Date(today);
  delivery.setDate(today.getDate() + minDays);

  const deliveryMax = new Date(today);
  deliveryMax.setDate(today.getDate() + maxDays);

  return (
    <div
      style={{
        fontSize: 14,
        opacity: 0.85,
        marginTop: 6,
      }}
    >
      🚚 Estimated Delivery{" "}
      <strong>
        {delivery.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
        {" – "}
        {deliveryMax.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </strong>
    </div>
  );
}
