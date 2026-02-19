import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Product } from "@/lib/types";
import AddToCartClient from "./AddToCartClient";
import RetryButton from "./RetryButton";

interface Props {
  // FIX: params is a Promise in Next.js 15, plain object in Next.js 14
  params: Promise<{ id: string }> | { id: string };
}

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────────
   Server-side product fetch
   - Forwards session cookie for auth-aware responses
   - Retries once after 2s on transient errors (Render cold starts)
   - Distinguishes real 404 from server errors so users don't see
     a misleading "page not found" when the backend is just waking up
───────────────────────────────────────────────────────────────── */

type FetchResult =
  | { ok: true; product: Product }
  | { ok: false; status: number; message: string };

async function fetchProduct(id: string): Promise<FetchResult> {
  const API =
    process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";
  const url = `${API}/api/products/${id}`;

  // Forward the incoming request's cookies so the backend gets the session
  // FIX: cookies().toString() returns "" in Next.js 14 — must use .getAll()
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join("; ");

  const opts: RequestInit = {
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    // FIX: revalidate conflicts with force-dynamic — use no-store instead
    cache: "no-store",
  };

  async function attempt(): Promise<FetchResult> {
    try {
      const res = await fetch(url, opts);

      if (res.ok) {
        const product = (await res.json()) as Product;
        return { ok: true, product };
      }

      // True 404 — product doesn't exist
      if (res.status === 404) {
        return { ok: false, status: 404, message: "Product not found" };
      }

      // Auth errors
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, message: "Access denied" };
      }

      // Server error (5xx) — likely Render cold start
      let message = `Server error (${res.status})`;
      try {
        const data = await res.json();
        message = data.detail || data.message || message;
      } catch {}
      return { ok: false, status: res.status, message };
    } catch (err: any) {
      // Network timeout or DNS failure
      return {
        ok: false,
        status: 0,
        message: err?.message ?? "Network error — server may be starting up",
      };
    }
  }

  const first = await attempt();

  // Don't retry genuine 404/401/403 — those won't change
  // Narrow to the error branch explicitly so TS can see .status
  if (first.ok === false) {
    const { status } = first;
    if (status !== 404 && status !== 401 && status !== 403) {
      // Wait 2s then retry — gives Render's free tier time to wake up
      await new Promise((r) => setTimeout(r, 2000));
      return attempt();
    }
  }

  return first;
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default async function ProductPage({ params }: Props) {
  // FIX: In Next.js 15, params is a Promise — resolve it safely for both versions
  const resolvedParams = await Promise.resolve(params);
  const result = await fetchProduct(resolvedParams.id);

  // Only call notFound() on a genuine 404 — not on server errors
  if (result.ok === false && result.status === 404) {
    notFound();
  }

  // Server error — show a clear "server waking up" message with retry
  if (result.ok === false) {
    const { message } = result;
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          textAlign: "center",
          background: "#fafaf8",
        }}
      >
        <div style={{ fontSize: 56 }}>⚠️</div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            margin: 0,
            color: "#0f172a",
          }}
        >
          Could not load product
        </h2>
        <p
          style={{
            color: "#64748b",
            margin: 0,
            maxWidth: 400,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          The server may be starting up — this typically takes 30–60 seconds
          on the first request. Please try again.
          {message && (
            <span
              style={{
                display: "block",
                marginTop: 8,
                fontSize: 12,
                color: "#94a3b8",
                fontFamily: "monospace",
              }}
            >
              {message}
            </span>
          )}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <RetryButton />
          <Link
            href="/store"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              color: "#475569",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ← Back to Store
          </Link>
        </div>
      </div>
    );
  }

  const { product } = result;

  return (
    <div
      style={{ background: "#fafaf8", minHeight: "100vh", paddingBottom: 80 }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 0",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            color: "#94a3b8",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/store"
            style={{ color: "#64748b", textDecoration: "none" }}
          >
            Store
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/store/${encodeURIComponent(product.category)}`}
                style={{ color: "#64748b", textDecoration: "none" }}
              >
                {product.category}
              </Link>
            </>
          )}
          <span>/</span>
          <span
            style={{
              color: "#0f172a",
              maxWidth: 240,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.title}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {/* Images + variants + add to cart */}
        <AddToCartClient product={product} />

        {/* Description */}
        {(product.description || product.short_description) && (
          <div
            style={{
              marginTop: 56,
              paddingTop: 40,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 16,
              }}
            >
              About this product
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "#475569",
                lineHeight: 1.75,
                maxWidth: 740,
                margin: 0,
              }}
            >
              {product.description ?? product.short_description}
            </p>
          </div>
        )}

        {/* Features */}
        {Array.isArray(product.features) &&
          (product.features as string[]).length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 16,
                }}
              >
                Features
              </h2>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {(product.features as string[]).map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      fontSize: 14,
                      color: "#475569",
                    }}
                  >
                    <span
                      style={{
                        marginTop: 5,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#0f172a",
                        flexShrink: 0,
                      }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Specifications */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 16,
              }}
            >
              Specifications
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {Object.entries(product.specs).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      marginBottom: 4,
                    }}
                  >
                    {key.replace(/_/g, " ")}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  >
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}