export default function DeliveryEstimate() {
  const today = new Date();
  const delivery = new Date(today);
  delivery.setDate(today.getDate() + 4);

  return (
    div style={{ fontSize 14, opacity 0.8 }}
      Estimated Delivery{ }
      strong
        {delivery.toLocaleDateString(en-US, {
          month long,
          day numeric,
        })}
      strong
    div
  );
}
