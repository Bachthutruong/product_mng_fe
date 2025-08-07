"use client";
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/services/api';
import { Product } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Package, AlertTriangle, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProductSelectorProps {
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
}

export function ProductSelector({ onProductSelect, placeholder = "搜尋產品...", className }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', { search: searchTerm, limit: 20 }],
    queryFn: () => getProducts({ search: searchTerm, limit: 20 }).then(res => res.data),
    staleTime: 1000,
    enabled: showDropdown,
  });

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
  };

  const getStockStatus = (stock: number, lowStockThreshold: number) => {
    if (stock <= 0) return { status: 'out', color: 'destructive', text: '缺貨' };
    if (stock <= lowStockThreshold) return { status: 'low', color: 'secondary', text: '庫存不足' };
    return { status: 'available', color: 'default', text: '有庫存' };
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div ref={dropdownRef} className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto border rounded-lg bg-background shadow-lg">
            {isLoading && (
              <div className="p-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">搜尋產品中...</p>
              </div>
            )}

            {!isLoading && products.length === 0 && (
              <div className="p-4 text-center">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">找不到產品</p>
                <p className="text-xs text-muted-foreground">請調整搜尋條件</p>
              </div>
            )}

            {!isLoading && products.length > 0 && (
              <div className="py-2">
                {products.map((product: Product) => {
                  const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
                  return (
                    <div
                      key={product._id}
                      onClick={() => handleProductSelect(product)}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            <Badge variant={stockStatus.color as any} className="text-xs">
                              {stockStatus.text}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>SKU: {product.sku}</span>
                            <span>價格: {formatCurrency(product.price)}</span>
                            <span>庫存: {product.stock}</span>
                            {product.unit && <span>單位: {product.unit}</span>}
                          </div>

                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {product.description}
                            </p>
                          )}

                          {stockStatus.status === 'low' && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                              <AlertTriangle className="h-3 w-3" />
                              庫存不足警告 (門檻: {product.lowStockThreshold})
                            </div>
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 