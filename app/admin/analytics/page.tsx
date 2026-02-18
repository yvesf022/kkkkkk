"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    adminApi.getOverviewAnalytics().then(setOverview);
  }, []);

  if (!overview) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Enterprise Analytics
      </h1>

      <pre style={box}>
        {JSON.stringify(overview, null, 2)}
      </pre>
    </div>
  );
}

const box = {
  marginTop: 20,
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};
