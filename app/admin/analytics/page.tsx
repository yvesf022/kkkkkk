"use client";

/**
 * FIX: <TD color={C.success}> — the TD component doesn't accept a `color` prop.
 * Moved color styling inside child element: <TD><strong style={{ color: C.success }}>…</strong></TD>
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, StatCard, Card, CardHeader, Badge, Btn, Table, TR, TD,
  Tabs, fmtMoney, fmtNum, fmtDate, Skeleton,
} from "@/components/admin/AdminUI";

const TABS = [
  { label: "Overview",      value: "overview" },
  { label: "Revenue",       value: "revenue" },
  { label: "Top Products",  value: "top-products" },
  { label: "Dead Stock",    value: "dead-stock" },
  { label: "Turnover",      value: "turnover" },
  { label: "Orders",        value: "orders" },
];

export default function AdminAnalyticsPage() {
  const [tab,             setTab]             = useState("overview");
  const [overview,        setOverview]        = useState<any>(null);
  const [revenue,         setRevenue]         = useState<any[]>([]);
  const [topProducts,     setTopProducts]     = useState<any[]>([]);
  const [deadStock,       setDeadStock]       = useState<any[]>([]);
  const [turnover,        setTurnover]        = useState<any[]>([]);
  const [ordersAnalytics, setOrdersAnalytics] = useState<any>(null);
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    setLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      overview:        () => adminApi.getOverviewAnalytics().then(setOverview),
      revenue:         () => adminApi.getRevenueAnalytics().then(d => setRevenue(Array.isArray(d) ? d : (d as any)?.data ?? [])),
      "top-products":  () => adminApi.getTopProducts().then(d => setTopProducts(Array.isArray(d) ? d : (d as any)?.products ?? [])),
      "dead-stock":    () => adminApi.getDeadStock().then(d => setDeadStock(Array.isArray(d) ? d : (d as any)?.products ?? [])),
      turnover:        () => adminApi.getStockTurnover().then(d => setTurnover(Array.isArray(d) ? d : (d as any)?.products ?? [])),
      orders:          () => adminApi.getOrdersAnalytics().then(setOrdersAnalytics),
    };
    loaders[tab]?.()
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div style={{ maxWidth: 1300 }}>
      <PageTitle sub="Business intelligence and performance metrics">Analytics</PageTitle>
      <Tabs options={TABS} value={tab} onChange={setTab} />
      {loading ? <Skeleton rows={8} /> : (
        <>
          {tab === "overview"     && <OverviewTab     data={overview} />}
          {tab === "revenue"      && <RevenueTab      data={revenue} />}
          {tab === "top-products" && <TopProductsTab  data={topProducts} />}
          {tab === "dead-stock"   && <DeadStockTab    data={deadStock} />}
          {tab === "turnover"     && <TurnoverTab     data={turnover} />}
          {tab === "orders"       && <OrdersTab       data={ordersAnalytics} />}
        </>
      )}
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  if (!data) return <NoData />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Total Revenue"      value={fmtMoney(data.total_revenue)}      color={C.navy} />
        <StatCard label="Revenue This Month" value={fmtMoney(data.revenue_this_month)} color={C.green} />
        <StatCard label="Total Orders"       value={fmtNum(data.total_orders)} />
        <StatCard label="Paid Orders"        value={fmtNum(data.paid_orders)}          color={C.success} />
        <StatCard label="Pending Payments"   value={fmtNum(data.pending_payments)}     alert={data.pending_payments > 0} />
        <StatCard label="Active Products"    value={fmtNum(data.active_products)}      color={C.green} />
        <StatCard label="Low Stock"          value={fmtNum(data.low_stock_products)}   alert={data.low_stock_products > 0} />
        <StatCard label="Total Products"     value={fmtNum(data.total_products)} />
      </div>
    </div>
  );
}

function RevenueTab({ data }: { data: any[] }) {
  if (!data?.length) return <NoData />;
  const maxRev = Math.max(...data.map(d => d.revenue ?? 0), 1);
  const total  = data.reduce((s, d) => s + (d.revenue ?? 0), 0);
  const orders = data.reduce((s, d) => s + (d.orders ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Period Revenue" value={fmtMoney(total)} color={C.navy} />
        <StatCard label="Period Orders"  value={fmtNum(orders)} />
        <StatCard label="Avg Per Day"    value={fmtMoney(total / (data.length || 1))} />
      </div>

      <Card>
        <CardHeader title="Revenue Over Time" />
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, minWidth: 400, padding: "0 4px" }}>
            {data.slice(-30).map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 20 }}>
                <div style={{
                  width: "100%", borderRadius: "3px 3px 0 0",
                  background: `linear-gradient(180deg, ${C.navy}, ${C.green})`,
                  height: `${Math.max(4, ((d.revenue ?? 0) / maxRev) * 130)}px`,
                  transition: "height 0.3s ease",
                }} title={`${fmtDate(d.date)}: ${fmtMoney(d.revenue)}`} />
                {i % 5 === 0 && (
                  <div style={{ fontSize: 9, color: C.faint, whiteSpace: "nowrap" }}>
                    {fmtDate(d.date)?.slice(0, 6)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Daily Breakdown" />
        <Table headers={["Date", "Revenue", "Orders", "Avg Order"]}>
          {data.slice().reverse().slice(0, 30).map((d, i) => (
            <TR key={i}>
              <TD>{fmtDate(d.date)}</TD>
              <TD><strong>{fmtMoney(d.revenue)}</strong></TD>
              <TD>{fmtNum(d.orders)}</TD>
              <TD muted>{d.orders > 0 ? fmtMoney((d.revenue ?? 0) / d.orders) : "—"}</TD>
            </TR>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function TopProductsTab({ data }: { data: any[] }) {
  if (!data?.length) return <NoData />;
  return (
    <Card>
      <CardHeader title="Top Performing Products" />
      <Table headers={["#", "Product", "Sales", "Revenue", "Stock", ""]}>
        {data.map((p, i) => (
          <TR key={p.product_id ?? i}>
            <TD muted>#{i + 1}</TD>
            <TD>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: C.faint, fontFamily: "monospace" }}>{p.product_id?.slice(0, 12)}</div>
            </TD>
            <TD><strong>{fmtNum(p.sales)}</strong> units</TD>
            {/* FIX: TD doesn't accept color prop — apply color inside child element */}
            <TD><strong style={{ color: C.success }}>{fmtMoney(p.revenue)}</strong></TD>
            <TD>
              <span style={{ color: p.stock < 10 ? C.danger : p.stock < 30 ? C.warn : C.text }}>
                {fmtNum(p.stock)}
              </span>
            </TD>
            <TD>
              <Link href={`/admin/products/${p.product_id}`} style={{ color: C.accent, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                View →
              </Link>
            </TD>
          </TR>
        ))}
      </Table>
    </Card>
  );
}

function DeadStockTab({ data }: { data: any[] }) {
  if (!data?.length) return (
    <Card>
      <div style={{ textAlign: "center", padding: "32px", color: C.success, fontSize: 14 }}>
        ✓ No dead stock detected
      </div>
    </Card>
  );
  return (
    <Card>
      <CardHeader
        title="Dead Stock — Products with No Sales"
        action={
          <Link href="/admin/inventory" style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>
            Manage inventory →
          </Link>
        }
      />
      <Table headers={["Product", "Stock", "Days Listed", "Action"]}>
        {data.map((p, i) => (
          <TR key={p.product_id ?? i}>
            <TD>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
            </TD>
            <TD><span style={{ color: C.warn, fontWeight: 700 }}>{fmtNum(p.stock)}</span></TD>
            <TD muted>{fmtNum(p.days_listed ?? p.days_in_stock)} days</TD>
            <TD>
              <Link href={`/admin/products/${p.product_id}`} style={{ color: C.accent, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                Edit →
              </Link>
            </TD>
          </TR>
        ))}
      </Table>
    </Card>
  );
}

function TurnoverTab({ data }: { data: any[] }) {
  if (!data?.length) return <NoData />;
  return (
    <Card>
      <CardHeader title="Stock Turnover Rate" />
      <Table headers={["Product", "Turnover Rate", "Days in Stock", ""]}>
        {data.map((p, i) => (
          <TR key={p.product_id ?? i}>
            <TD><div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div></TD>
            <TD>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 80, height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${Math.min(100, (p.turnover_rate ?? 0) * 10)}%`,
                    background: p.turnover_rate > 5 ? C.success : p.turnover_rate > 2 ? C.warn : C.danger,
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{(p.turnover_rate ?? 0).toFixed(1)}×</span>
              </div>
            </TD>
            <TD muted>{fmtNum(p.days_in_stock)} days</TD>
            <TD>
              <Link href={`/admin/products/${p.product_id}`} style={{ color: C.accent, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                View →
              </Link>
            </TD>
          </TR>
        ))}
      </Table>
    </Card>
  );
}

function OrdersTab({ data }: { data: any }) {
  if (!data) return <NoData />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {Object.entries(data)
          .filter(([, v]) => typeof v === "number")
          .map(([k, v]) => (
            <StatCard
              key={k}
              label={k.replace(/_/g, " ")}
              value={typeof v === "number" && k.includes("revenue") ? fmtMoney(v) : fmtNum(v as number)}
            />
          ))}
      </div>
      {data.by_status && (
        <Card>
          <CardHeader title="Orders by Status" />
          <Table headers={["Status", "Count", "Revenue", "Share"]}>
            {Object.entries(data.by_status).map(([status, info]: [string, any]) => (
              <TR key={status}>
                <TD><Badge status={status} /></TD>
                <TD><strong>{fmtNum(info?.count)}</strong></TD>
                <TD>{fmtMoney(info?.revenue)}</TD>
                <TD muted>{info?.percentage?.toFixed(1)}%</TD>
              </TR>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}

function NoData() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: C.faint }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>◎</div>
      <div style={{ fontSize: 14 }}>No data available for this period.</div>
    </div>
  );
}