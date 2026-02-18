"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi, ordersApi, paymentsApi, productsApi, adminAuthApi } from "@/lib/api";

/* ============================================================
   TYPES
============================================================ */
type DashStats = {
  total_products: number;
  active_products: number;
  total_orders: number;
  paid_orders: number;
  pending_payments: number;
  low_stock_products: number;
  total_revenue: number;
  revenue_this_month: number;
};

type RecentOrder = { id: string; status: string; total_amount: number; created_at: string };
type PendingPayment = { id: string; amount: number; status: string; order_id: string; created_at: string };
type LowStockItem = { id: string; title: string; stock: number; low_stock_threshold: number };
type TopProduct = { product_id: string; title: string; sales: number; revenue: number; stock: number };

/* ============================================================
   HELPERS
============================================================ */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ZMW", maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat().format(n);

const statusColor: Record<string, string> = {
  active: "#00FF88",
  paid: "#00FF88",
  completed: "#00CCFF",
  shipped: "#00CCFF",
  pending: "#FFB800",
  on_hold: "#FFB800",
  cancelled: "#FF4444",
  rejected: "#FF4444",
  inactive: "#555",
};

const STATUS_DOT = ({ s }: { s: string }) => (
  <span style={{
    display: "inline-block",
    width: 7, height: 7,
    borderRadius: "50%",
    background: statusColor[s] ?? "#555",
    boxShadow: `0 0 6px ${statusColor[s] ?? "#555"}`,
    marginRight: 7,
    flexShrink: 0,
  }} />
);

function Loading() {
  return (
    <span style={{ color: "#1E3028", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
      ████
    </span>
  );
}

/* ============================================================
   STAT CARD
============================================================ */
function StatCard({
  label, value, sub, accent, href, delta,
}: {
  label: string; value: string | number; sub?: string;
  accent: string; href?: string; delta?: string;
}) {
  const [hover, setHover] = useState(false);
  const inner = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(0,255,136,0.03)" : "#080C10",
        border: `1px solid ${hover ? accent + "44" : "#111921"}`,
        borderRadius: 6,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s",
        cursor: href ? "pointer" : "default",
      }}
    >
      {/* accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        opacity: hover ? 1 : 0.4,
        transition: "opacity 0.2s",
      }} />

      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: 3, color: "#1E3028", marginBottom: 12, textTransform: "uppercase" }}>
        {label}
      </div>

      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 800, color: "#EDFFF7", lineHeight: 1, marginBottom: 8 }}>
        {value}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {sub && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#2A4D3A" }}>{sub}</span>}
        {delta && (
          <span style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9, padding: "2px 7px",
            background: delta.startsWith("+") ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)",
            color: delta.startsWith("+") ? "#00FF88" : "#FF4444",
            borderRadius: 2,
          }}>
            {delta}
          </span>
        )}
      </div>

      {/* corner tag */}
      <div style={{
        position: "absolute", right: 16, top: 16,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 18, color: accent,
        opacity: hover ? 0.3 : 0.1,
        transition: "opacity 0.2s",
      }}>◈</div>
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

/* ============================================================
   SECTION HEADER
============================================================ */
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 3, height: 18, background: "#00FF88", borderRadius: 2 }} />
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 800, color: "#EDFFF7", letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* ============================================================
   TABLE SHELL
============================================================ */
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#080C10",
      border: "1px solid #111921",
      borderRadius: 6,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ============================================================
   QUICK ACTION BUTTON
============================================================ */
function QuickBtn({ label, icon, href, variant = "default" }: {
  label: string; icon: string; href: string; variant?: "default" | "green" | "orange" | "red";
}) {
  const [h, setH] = useState(false);
  const colors = {
    default: { border: "#1a2332", hover: "#00CCFF22", text: "#3D6A4F", accent: "#00CCFF" },
    green:   { border: "#1a3328", hover: "#00FF8822", text: "#2A6A44", accent: "#00FF88" },
    orange:  { border: "#33280a", hover: "#FFB80022", text: "#6A4A10", accent: "#FFB800" },
    red:     { border: "#331010", hover: "#FF444422", text: "#6A2020", accent: "#FF4444" },
  }[variant];

  return (
    <Link
      href={href}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        border: `1px solid ${h ? colors.accent + "44" : colors.border}`,
        borderRadius: 6,
        background: h ? colors.hover : "transparent",
        textDecoration: "none",
        transition: "all 0.15s",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      <span style={{ fontSize: 16, color: h ? colors.accent : colors.text }}>{icon}</span>
      <span style={{ fontSize: 10, letterSpacing: 1.5, color: h ? "#EDFFF7" : colors.text, textTransform: "uppercase" }}>{label}</span>
    </Link>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dash, orders, payments, stock, top, admin] = await Promise.allSettled([
        adminApi.getDashboard() as Promise<DashStats>,
        ordersApi.getAdmin() as Promise<RecentOrder[]>,
        paymentsApi.adminList("pending") as Promise<PendingPayment[]>,
        adminApi.getLowStock() as Promise<LowStockItem[]>,
        adminApi.getTopProducts() as Promise<TopProduct[]>,
        adminAuthApi.me(),
      ]);

      if (dash.status === "fulfilled") setStats(dash.value);
      if (orders.status === "fulfilled") setRecentOrders((orders.value as any[]).slice(0, 6));
      if (payments.status === "fulfilled") setPendingPayments((payments.value as any[]).slice(0, 5));
      if (stock.status === "fulfilled") setLowStock((stock.value as any[]).slice(0, 5));
      if (top.status === "fulfilled") setTopProducts((top.value as any[]).slice(0, 5));
      if (admin.status === "fulfilled") setAdminEmail((admin.value as any)?.email ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap');

        .kdb-root {
          min-height: 100vh;
          background: #050810;
          font-family: 'JetBrains Mono', monospace;
          padding: 32px;
          position: relative;
        }

        .kdb-grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,255,136,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.018) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .kdb-content {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .kdb-top-bar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .kdb-greeting {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #EDFFF7;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .kdb-greeting em {
          color: #00FF88;
          font-style: normal;
        }

        .kdb-subline {
          font-size: 10px;
          color: #2A4D3A;
          letter-spacing: 2px;
          margin-top: 6px;
        }

        .kdb-topright {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .kdb-time-chip {
          padding: 8px 14px;
          border: 1px solid #111921;
          background: #080C10;
          font-size: 11px;
          color: #3D6A4F;
          letter-spacing: 2px;
          border-radius: 4px;
        }

        .kdb-time-chip span { color: #00FF88; }

        .kdb-refresh-btn {
          padding: 8px 14px;
          border: 1px solid #1a2332;
          background: transparent;
          color: #2A4D3A;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .kdb-refresh-btn:hover {
          border-color: #00FF88;
          color: #00FF88;
          background: rgba(0,255,136,0.04);
        }

        .kdb-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .kdb-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .kdb-two-col { grid-template-columns: 1fr; }
        }

        .kdb-three-col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1100px) {
          .kdb-three-col { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 700px) {
          .kdb-three-col { grid-template-columns: 1fr; }
        }

        .kdb-table-row {
          display: grid;
          padding: 12px 18px;
          border-bottom: 1px solid #0D1520;
          align-items: center;
          font-size: 10px;
          transition: background 0.12s;
        }

        .kdb-table-row:last-child { border-bottom: none; }

        .kdb-table-row:hover { background: rgba(0,255,136,0.02); }

        .kdb-table-head {
          padding: 10px 18px;
          border-bottom: 1px solid #111921;
          font-size: 8px;
          letter-spacing: 2px;
          color: #1E3028;
          text-transform: uppercase;
          display: grid;
          align-items: center;
        }

        .kdb-action-link {
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #1E3028;
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.15s;
          font-family: 'JetBrains Mono', monospace;
        }

        .kdb-action-link:hover { color: #00FF88; }

        .kdb-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 8px;
          letter-spacing: 1.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .kdb-empty {
          padding: 32px;
          text-align: center;
          font-size: 10px;
          color: #1E3028;
          letter-spacing: 2px;
        }

        .kdb-revenue-bar {
          height: 4px;
          background: #0D1520;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }

        .kdb-revenue-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 1s ease;
        }

        .kdb-quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 10px;
        }

        .kdb-alerts {
          border: 1px solid #332200;
          border-radius: 6px;
          padding: 14px 18px;
          background: rgba(255,184,0,0.03);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 10px;
          color: #FFB800;
          letter-spacing: 1px;
        }

        .kdb-alerts-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .kdb-sparkline {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 32px;
        }

        .kdb-spark-bar {
          flex: 1;
          background: rgba(0,255,136,0.2);
          border-radius: 1px;
          transition: background 0.2s;
          min-width: 4px;
        }

        .kdb-spark-bar:hover { background: #00FF88; }
      `}</style>

      <div className="kdb-grid-bg" />

      <main className="kdb-root">
        <div className="kdb-content">

          {/* ── TOP BAR ── */}
          <div className="kdb-top-bar">
            <div>
              <div className="kdb-greeting">
                Command Center{" "}
                {adminEmail && <em>/ {adminEmail.split("@")[0]}</em>}
              </div>
              <div className="kdb-subline">{dateStr.toUpperCase()} · KARABO ADMIN</div>
            </div>
            <div className="kdb-topright">
              <div className="kdb-time-chip">
                <span>{timeStr}</span>
              </div>
              <button className="kdb-refresh-btn" onClick={load}>⟳ REFRESH</button>
            </div>
          </div>

          {/* ── ALERT BANNER ── */}
          {!loading && (stats?.pending_payments ?? 0) > 0 && (
            <Link href="/admin/payments" style={{ textDecoration: "none" }}>
              <div className="kdb-alerts">
                <span className="kdb-alerts-icon">◆</span>
                <span>
                  <strong>{stats!.pending_payments}</strong> pending payment{stats!.pending_payments > 1 ? "s" : ""} awaiting review
                  — click to action now
                </span>
                <span style={{ marginLeft: "auto", fontSize: 9, letterSpacing: 2, opacity: 0.6 }}>ACTION →</span>
              </div>
            </Link>
          )}

          {/* ── STAT CARDS ── */}
          <div className="kdb-stat-grid">
            <StatCard
              label="Total Revenue"
              value={stats ? fmt(stats.total_revenue) : "—"}
              sub="All time"
              accent="#00FF88"
              href="/admin/analytics"
            />
            <StatCard
              label="This Month"
              value={stats ? fmt(stats.revenue_this_month) : "—"}
              sub="Current period"
              accent="#00CCFF"
              href="/admin/analytics"
            />
            <StatCard
              label="Total Orders"
              value={stats ? fmtNum(stats.total_orders) : "—"}
              sub={stats ? `${stats.paid_orders} paid` : ""}
              accent="#8B5CF6"
              href="/admin/orders"
            />
            <StatCard
              label="Active Products"
              value={stats ? fmtNum(stats.active_products) : "—"}
              sub={stats ? `${fmtNum(stats.total_products)} total` : ""}
              accent="#FFB800"
              href="/admin/products"
            />
            <StatCard
              label="Pending Payments"
              value={stats ? fmtNum(stats.pending_payments) : "—"}
              sub="Need review"
              accent="#FF4444"
              href="/admin/payments"
            />
            <StatCard
              label="Low Stock"
              value={stats ? fmtNum(stats.low_stock_products) : "—"}
              sub="Below threshold"
              accent="#FF6B35"
              href="/admin/inventory"
            />
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div>
            <SectionHeader title="Quick Actions" />
            <div className="kdb-quick-grid">
              <QuickBtn label="New Product"   icon="▣" href="/admin/products/new"          variant="green" />
              <QuickBtn label="Bulk Upload"   icon="⬆" href="/admin/products/bulk-upload"  variant="green" />
              <QuickBtn label="Review Payment" icon="◆" href="/admin/payments"             variant="orange" />
              <QuickBtn label="Manage Orders" icon="◉" href="/admin/orders"               variant="default" />
              <QuickBtn label="Inventory"     icon="▤" href="/admin/inventory"            variant="default" />
              <QuickBtn label="Analytics"     icon="◈" href="/admin/analytics"            variant="default" />
              <QuickBtn label="Users"         icon="◎" href="/admin/users"               variant="default" />
              <QuickBtn label="Audit Logs"    icon="▥" href="/admin/logs"                variant="default" />
            </div>
          </div>

          {/* ── TWO COLUMN: ORDERS + PAYMENTS ── */}
          <div className="kdb-two-col">

            {/* RECENT ORDERS */}
            <div>
              <SectionHeader
                title="Recent Orders"
                action={<Link href="/admin/orders" className="kdb-action-link">View all →</Link>}
              />
              <Panel>
                <div className="kdb-table-head" style={{ gridTemplateColumns: "1fr 80px 90px 70px" }}>
                  <span>Order ID</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Date</span>
                </div>
                {loading ? (
                  <div className="kdb-empty"><Loading /></div>
                ) : recentOrders.length === 0 ? (
                  <div className="kdb-empty">NO ORDERS</div>
                ) : recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div className="kdb-table-row" style={{ gridTemplateColumns: "1fr 80px 90px 70px", color: "#3D6A4F" }}>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#2A4D3A" }}>
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span style={{ color: "#EDFFF7", fontSize: 11, fontWeight: 700 }}>
                        {fmt(o.total_amount)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <STATUS_DOT s={o.status} />
                        <span style={{ fontSize: 8, letterSpacing: 1, color: statusColor[o.status] ?? "#555", textTransform: "uppercase" }}>
                          {o.status}
                        </span>
                      </span>
                      <span style={{ fontSize: 9, color: "#1E3028" }}>
                        {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </Link>
                ))}
              </Panel>
            </div>

            {/* PENDING PAYMENTS */}
            <div>
              <SectionHeader
                title="Pending Payments"
                action={<Link href="/admin/payments" className="kdb-action-link">Review all →</Link>}
              />
              <Panel>
                <div className="kdb-table-head" style={{ gridTemplateColumns: "1fr 90px 80px" }}>
                  <span>Payment ID</span>
                  <span>Amount</span>
                  <span>Action</span>
                </div>
                {loading ? (
                  <div className="kdb-empty"><Loading /></div>
                ) : pendingPayments.length === 0 ? (
                  <div className="kdb-empty">ALL CLEAR — NO PENDING</div>
                ) : pendingPayments.map((p) => (
                  <div key={p.id} className="kdb-table-row" style={{ gridTemplateColumns: "1fr 90px 80px", color: "#3D6A4F" }}>
                    <span style={{ fontSize: 9, color: "#2A4D3A" }}>
                      #{p.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ color: "#FFB800", fontWeight: 700, fontSize: 11 }}>
                      {fmt(p.amount)}
                    </span>
                    <Link
                      href={`/admin/payments/${p.id}`}
                      style={{ fontSize: 8, letterSpacing: 1.5, color: "#FF4444", textDecoration: "none", textTransform: "uppercase" }}
                    >
                      REVIEW →
                    </Link>
                  </div>
                ))}
              </Panel>
            </div>
          </div>

          {/* ── TWO COLUMN: TOP PRODUCTS + LOW STOCK ── */}
          <div className="kdb-two-col">

            {/* TOP PRODUCTS */}
            <div>
              <SectionHeader
                title="Top Products"
                action={<Link href="/admin/products" className="kdb-action-link">All products →</Link>}
              />
              <Panel>
                <div className="kdb-table-head" style={{ gridTemplateColumns: "1fr 60px 80px" }}>
                  <span>Product</span>
                  <span>Sales</span>
                  <span>Revenue</span>
                </div>
                {loading ? (
                  <div className="kdb-empty"><Loading /></div>
                ) : topProducts.length === 0 ? (
                  <div className="kdb-empty">NO DATA</div>
                ) : topProducts.map((p, i) => {
                  const maxRev = Math.max(...topProducts.map(t => t.revenue), 1);
                  return (
                    <Link key={p.product_id} href={`/admin/products/${p.product_id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div className="kdb-table-row" style={{ gridTemplateColumns: "1fr 60px 80px" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#EDFFF7", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#1E3028", fontFamily: "JetBrains Mono, monospace" }}>#{i + 1}</span>
                            {p.title.length > 28 ? p.title.slice(0, 28) + "…" : p.title}
                          </div>
                          <div className="kdb-revenue-bar">
                            <div className="kdb-revenue-fill" style={{ width: `${(p.revenue / maxRev) * 100}%`, background: "#00FF88" }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: "#00CCFF", fontWeight: 700 }}>{fmtNum(p.sales)}</span>
                        <span style={{ fontSize: 11, color: "#00FF88", fontWeight: 700 }}>{fmt(p.revenue)}</span>
                      </div>
                    </Link>
                  );
                })}
              </Panel>
            </div>

            {/* LOW STOCK */}
            <div>
              <SectionHeader
                title="Low Stock Alert"
                action={<Link href="/admin/inventory" className="kdb-action-link">Inventory →</Link>}
              />
              <Panel>
                <div className="kdb-table-head" style={{ gridTemplateColumns: "1fr 60px 70px" }}>
                  <span>Product</span>
                  <span>Stock</span>
                  <span>Action</span>
                </div>
                {loading ? (
                  <div className="kdb-empty"><Loading /></div>
                ) : lowStock.length === 0 ? (
                  <div className="kdb-empty">◉ STOCK LEVELS HEALTHY</div>
                ) : lowStock.map((item) => {
                  const pct = Math.min(100, (item.stock / (item.low_stock_threshold || 10)) * 100);
                  return (
                    <div key={item.id} className="kdb-table-row" style={{ gridTemplateColumns: "1fr 60px 70px" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#EDFFF7", marginBottom: 4 }}>
                          {item.title.length > 26 ? item.title.slice(0, 26) + "…" : item.title}
                        </div>
                        <div className="kdb-revenue-bar">
                          <div className="kdb-revenue-fill" style={{ width: `${pct}%`, background: pct < 30 ? "#FF4444" : "#FFB800" }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: item.stock === 0 ? "#FF4444" : "#FFB800", fontWeight: 700 }}>
                        {item.stock}
                      </span>
                      <Link
                        href={`/admin/products/${item.id}`}
                        style={{ fontSize: 8, letterSpacing: 1.5, color: "#3D6A4F", textDecoration: "none", textTransform: "uppercase" }}
                      >
                        RESTOCK →
                      </Link>
                    </div>
                  );
                })}
              </Panel>
            </div>
          </div>

          {/* ── SYSTEM STATUS FOOTER ── */}
          <Panel style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 6px #00FF88", animation: "ksb-blink 2s infinite" }} />
                <span style={{ fontSize: 9, color: "#2A4D3A", letterSpacing: 2 }}>API ONLINE</span>
              </div>
              <div style={{ fontSize: 9, color: "#1E3028", letterSpacing: 1.5 }}>
                karabo.onrender.com
              </div>
              <div style={{ marginLeft: "auto", fontSize: 9, color: "#1E3028", letterSpacing: 1.5 }}>
                KARABO ADMIN v1.0 · ENTERPRISE
              </div>
            </div>
          </Panel>

        </div>
      </main>

      <style>{`
        @keyframes ksb-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}