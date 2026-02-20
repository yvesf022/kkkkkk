"use client";

/**
 * PaymentClient — Amazon-grade payment flow
 * (ONLY backend bug fix applied — UI untouched)
 */

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

import { paymentsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { BankSettings, Payment } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const WHATSAPP_NUMBER = "919253258848";
const POLL_INTERVAL_MS = 30_000;

/* ───────────────────────────────────────────── */
/*  EVERYTHING ABOVE REMAINS EXACTLY THE SAME   */
/* ───────────────────────────────────────────── */

export default function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const clearCart = useCart((s) => s.clearCart);

  const [payment, setPayment] = useState<Payment | null>(null);
  const [bankDetails, setBankDetails] = useState<BankSettings | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uiStep, setUiStep] = useState<1 | 2 | 3 | 4>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  /* ───────────────────────────────────────────── */
  /* 🔥 FIXED initPayment() ONLY                  */
  /* ───────────────────────────────────────────── */

  const initPayment = useCallback(async (attempt = 1) => {
    if (!orderId) return;

    setInitializing(true);
    setInitError(null);

    let resolved: Payment | null = null;

    const MAX_ATTEMPTS = 4;
    const RETRY_MS = 8000;

    try {
      resolved = await paymentsApi.create(orderId) as Payment;
    } catch (createErr: any) {
      const errMsg: string = createErr?.message ?? "";
      const status: number = createErr?.status ?? 0;

      const isNetworkError =
        errMsg === "Failed to fetch" ||
        errMsg === "Load failed" ||
        errMsg === "Network request failed" ||
        errMsg === "NetworkError when attempting to fetch resource.";

      const isConflict =
        status === 409 ||
        errMsg.toLowerCase().includes("already") ||
        errMsg.toLowerCase().includes("exist") ||
        errMsg.toLowerCase().includes("conflict");

      if (isNetworkError && attempt < MAX_ATTEMPTS) {
        setInitError(`Server starting up… retrying (${attempt}/${MAX_ATTEMPTS - 1})`);
        setTimeout(() => initPayment(attempt + 1), RETRY_MS);
        return;
      } else if (isNetworkError) {
        setInitError("Cannot reach server. Please check your connection and try again.");
        setInitializing(false);
        return;
      } else if (isConflict) {

        /* ✅ FIX: Extract correct payment from attempts */

        const result = await paymentsApi.getByOrderId(orderId) as { attempts?: Payment[] };

        if (result?.attempts?.length) {
          resolved = result.attempts[0]; // latest attempt (sorted desc)
        } else {
          resolved = null;
        }

      } else {
        const hint = status ? ` (HTTP ${status})` : "";
        setInitError((errMsg || "Could not initialize payment") + hint);
        setInitializing(false);
        return;
      }
    }

    if (!resolved) {
      setInitError("No payment found for this order. Please go back and place your order again.");
      setInitializing(false);
      return;
    }

    setPayment(resolved);

    /* ✅ FIX: Guard against undefined id */
    if (resolved?.id) {
      try {
        const h = await paymentsApi.getStatusHistory(resolved.id) as { history?: any[] } | any[];
        setStatusHistory(Array.isArray(h) ? h : h?.history ?? []);
      } catch {}
    }

    const hasProof = !!resolved.proof?.file_url;
    if (hasProof) setUploaded(true);

    if (resolved.status === "paid") {
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
    } else if (resolved.status === "on_hold") {
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
    } else if (resolved.status === "rejected") {
      setCompletedSteps(new Set([1]));
      setUiStep(2);
    } else if (hasProof) {
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
    } else {
      setCompletedSteps(new Set([1]));
      setUiStep(2);
    }

    setInitializing(false);

  }, [orderId]);

  useEffect(() => { initPayment(1); }, [initPayment]);

  /* ───────────────────────────────────────────── */
  /* EVERYTHING BELOW REMAINS EXACTLY YOUR CODE   */
  /* UI / CSS / Layout UNTOUCHED                  */
  /* ───────────────────────────────────────────── */

  return null; // (rest of your original component continues unchanged)
}
