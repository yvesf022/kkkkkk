"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, ordersApi, paymentsApi } from "@/lib/api";
import { C, StatCard, Card, CardHeader, Badge, Btn, Table, TR, TD, fmtMoney, fmtNum, fmtDateTime, shortId, Skeleton, PageTitle } from "@/components/admin/AdminUI";

type Stats = {
  total_products: number;
  active_products: number;
  total_orders: number;
  paid_orders: number;
  pending_payments: number;
  low_stock_products: number;
  total_revenue: number;
  revenue_this_month: number;
};

export default function AdminDashboardPage() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [orders,   setOrders]   = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [refresh,  setRefresh]  = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      adminApi.getDashboard(),
      ordersApi.getAdmin(),
      paymentsApi.adminList("pending"),
      adminApi.getLowStock(),
    ]).then(([d, o, p, ls]) => {
      if (d.status  === "fulfilled") setStats(d.value as Stats);
      else setError("Dashboard data unavailable");
      if (o.status  === "fulfilled") setOrders((o.value as any[]).slice(0, 8));
      if (p.status  === "fulfilled") setPayments((p.value as any[]).slice(0, 8));
      if (ls.status === "fulfilled") setLowStock((ls.value as any[]).slice(0, 8));
    }).finally(() => setLoading(false));
  }, [refresh]);

  if (loading) return <DashSkeleton />;
  if (error && !stats) return (
    <div style={{ padding: 40, color: C.danger, textAlign: "center" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
      <div>{error}</div>
      <Btn style={{ marginTop: 16 }} onClick={() => setRefresh(r => r + 1)}>Retry</Btn>
    </div>
  );

  const s = stats ?? {} as Stats;

  return (
    <div style={{ maxWidth: 1400 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: -0.5 }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Btn onClick={() => setRefresh(r => r + 1)} variant="ghost" small>↺ Refresh</Btn>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Revenue"    value={fmtMoney(s.total_revenue)}     icon="◈" color={C.navy} />
        <StatCard label="This Month"       value={fmtMoney(s.revenue_this_month)} icon="↗" color={C.green} />
        <StatCard label="Total Orders"     value={fmtNum(s.total_orders)}         icon="◎" />
        <StatCard label="Paid Orders"      value={fmtNum(s.paid_orders)}          icon="✓" color={C.success} />
        <StatCard label="Pending Payments" value={fmtNum(s.pending_payments)}     icon="◇" alert={s.pending_payments > 0} />
        <StatCard label="Active Products"  value={fmtNum(s.active_products)}      icon="◈" color={C.green} />
        <StatCard label="Low Stock"        value={fmtNum(s.low_stock_products)}   icon="▦" alert={s.low_stock_products > 0} />
        <StatCard label="Total Products"   value={fmtNum(s.total_products)}       icon="▣" />
      </div>

      {/* ── Quick Actions ── */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Quick Actions" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "+ Add Product",       href: "/admin/products/new",           bg: C.navy,    fg: "#fff" },
            { label: "Bulk Upload CSV",     href: "/admin/products/bulk-upload",   bg: C.green,   fg: "#fff" },
            { label: "Review Payments",     href: "/admin/payments",               bg: "#dc2626", fg: "#fff", badge: s.pending_payments },
            { label: "Manage Orders",       href: "/admin/orders",                 bg: C.surface, fg: C.text },
            { label: "Inventory",           href: "/admin/inventory",              bg: C.surface, fg: C.text, badge: s.low_stock_products },
            { label: "Analytics",           href: "/admin/analytics",             bg: C.surface, fg: C.text },
            { label: "Customers",           href: "/admin/users",                  bg: C.surface, fg: C.text },
            { label: "Stores",              href: "/admin/stores",                 bg: C.surface, fg: C.text },
            { label: "Audit Logs",          href: "/admin/logs",                   bg: C.surface, fg: C.text },
            { label: "Bank Settings",       href: "/admin/settings/bank",          bg: C.surface, fg: C.text },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7,
              background: a.bg, color: a.fg,
              border: a.bg === C.surface ? `1px solid ${C.border}` : "none",
              position: "relative",
            }}>
              {a.label}
              {(a as any).badge > 0 && (
                <span style={{ background: a.bg === C.surface ? C.danger : "rgba(255,255,255,0.3)", color: a.bg === C.surface ? "#fff" : "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>
                  {(a as any).badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* ── Three-col live tables ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>

        {/* Recent Orders */}
        <Card>
          <CardHeader title="Recent Orders" action={<Link href="/admin/orders" style={viewAll}>View all →</Link>} />
          {orders.length === 0 ? <Empty msg="No orders yet." /> : (
            <Table headers={["Order", "Amount", "Status", "Date"]}>
              {orders.map(o => (
                <TR key={o.id}>
                  <TD><Link href={`/admin/orders/${o.id}`} style={linkStyle}>{shortId(o.id)}</Link></TD>
                  <TD>{fmtMoney(o.total_amount)}</TD>
                  <TD><Badge status={o.status} /></TD>
                  <TD muted>{fmtDateTime(o.created_at)}</TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader title="Pending Payments" action={<Link href="/admin/payments" style={viewAll}>View all →</Link>} />
          {payments.length === 0 ? <Empty msg="No pending payments." /> : (
            <Table headers={["ID", "Order", "Amount", "Action"]}>
              {payments.map(p => (
                <TR key={p.id}>
                  <TD mono>{shortId(p.id)}</TD>
                  <TD muted>{shortId(p.order_id)}</TD>
                  <TD><strong>{fmtMoney(p.amount)}</strong></TD>
                  <TD>
                    <Link href={`/admin/payments`} style={{ color: C.danger, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      Review →
                    </Link>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader title="Low Stock Alerts" action={<Link href="/admin/inventory" style={viewAll}>View all →</Link>} />
          {lowStock.length === 0
            ? <div style={{ textAlign: "center", padding: "32px 0", color: C.success, fontSize: 13 }}>✓ All products well stocked</div>
            : (
            <Table headers={["Product", "Stock", ""]}>
              {lowStock.map(p => (
                <TR key={p.id}>
                  <TD>
                    <div style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                      {p.title}
                    </div>
                  </TD>
                  <TD>
                    <span style={{ color: p.stock === 0 ? C.danger : C.warn, fontWeight: 800 }}>
                      {p.stock} {p.stock === 0 ? "OUT" : "left"}
                    </span>
                  </TD>
                  <TD>
                    <Link href={`/admin/products/${p.id}`} style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      Restock →
                    </Link>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 100, borderRadius: 14, background: "#e2e8f0", animation: "shimmer 1.4s infinite" }} />
        ))}
      </div>
      <Skeleton rows={6} />
      <style>{`@keyframes shimmer{from{opacity:.6}to{opacity:1}}`}</style>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ textAlign: "center", padding: "32px 0", color: C.faint, fontSize: 13 }}>{msg}</div>;
}

const viewAll: React.CSSProperties = { fontSize: 12, color: C.accent, textDecoration: "none", fontWeight: 600 };
const linkStyle: React.CSSProperties = { color: C.accent, textDecoration: "none", fontWeight: 600, fontFamily: "monospace", fontSize: 12 };