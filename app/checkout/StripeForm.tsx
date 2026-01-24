"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";

export default function StripeForm({
  clientSecret,
  loading,
  setLoading,
  onSuccess,
}: {
  clientSecret: string;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  async function handleConfirmPayment() {
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        toast.error(result.error.message || "Payment failed");
        setLoading(false);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        toast.success("Payment successful 🎉");
        onSuccess();
      }
    } catch {
      toast.error("Payment error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Card input */}
      <div className="glass neon-border" style={{ padding: 16 }}>
        <label style={{ fontWeight: 1000, marginBottom: 10, display: "block" }}>
          Card details
        </label>

        <div className="pill">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  fontSize: "15px",
                  color: "rgba(12, 14, 20, 0.98)",
                  "::placeholder": {
                    color: "rgba(12, 14, 20, 0.56)",
                  },
                },
                invalid: {
                  color: "rgba(255, 34, 140, 0.9)",
                },
              },
            }}
          />
        </div>
      </div>

      {/* Pay button */}
      <button
        className="btn btnPrimary"
        disabled={!stripe || loading}
        onClick={handleConfirmPayment}
        style={{ alignSelf: "flex-end" }}
      >
        {loading ? "Processing payment…" : "Pay securely"}
      </button>
    </div>
  );
}
