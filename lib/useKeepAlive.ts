"use client";

import { useEffect, useRef } from "react";

/**
 * Keep Render backend awake
 * Pings every 2 minutes to prevent free tier shutdown
 */
export function useKeepAlive() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    if (!API_URL) {
      console.warn("API_URL not configured, keep-alive disabled");
      return;
    }

    // Ping immediately on mount
    ping();

    // Then ping every 2 minutes (120000ms)
    intervalRef.current = setInterval(() => {
      ping();
    }, 120000); // 2 minutes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  async function ping() {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      await fetch(`${API_URL}/health`, {
        method: "GET",
        cache: "no-store",
      });
      console.log("✅ Backend pinged successfully");
    } catch (err) {
      console.error("❌ Backend ping failed:", err);
    }
  }
}