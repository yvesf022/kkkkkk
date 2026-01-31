import StoreToolbar from "@/components/layout/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";

export default function StoreHomePage() {
  return (
    <div className="space-y-6">
      {/* Store header / filters */}
      <StoreToolbar />

      {/* Category / store tabs */}
      <StoreTabs />

      {/* Product listing will live here */}
      <p className="text-gray-500">
        Select a category to browse products.
      </p>
    </div>
  );
}
