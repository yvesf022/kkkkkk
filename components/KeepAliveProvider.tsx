"use client";

import { useKeepAlive } from "@/lib/useKeepAlive";

/**
 * Keep-Alive Provider Component
 * Add this to your root layout to keep backend awake
 */
export function KeepAliveProvider({ children }: { children: React.ReactNode }) {
  useKeepAlive();
  
  return <>{children}</>;
}