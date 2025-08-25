import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/api";
import { InventoryOperationForm } from "@/components/inventory/InventoryOperationForm";
import { MovementHistory } from "@/components/inventory/MovementHistory";

export default function InventoryPage() {
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'all'], // Use a distinct query key for all products
    queryFn: () => getProducts({ limit: 1000, discontinued: 'false' }), // Fetch all active products for the form
  });

  const allProducts = productsData?.data || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">庫存管理</h1>
      {isLoadingProducts ? (
        <p>載入產品中...</p>
      ) : (
        <InventoryOperationForm products={allProducts} />
      )}
      <MovementHistory />
    </div>
  );
}
