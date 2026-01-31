import { redirect } from "next/navigation";

/**
 * Amazon-level canonical redirect
 *
 * /store/store → /store/all
 *
 * Prevents duplicate storefronts
 * Keeps SEO + UX clean
 */
export default function StoreAliasPage() {
  redirect("/store/all");
}
