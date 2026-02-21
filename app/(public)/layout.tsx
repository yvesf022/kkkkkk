"use client";

/**
 * PUBLIC LAYOUT — FINAL & CORRECT
 *
 * RULES (ABSOLUTE):
 * - NO auth logic
 * - NO redirects
 * - NO hiding UI
 * - MUST always render children
 *
 * Reason:
 * Route groups do NOT unmount instantly.
 * Returning null here breaks navigation.
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
