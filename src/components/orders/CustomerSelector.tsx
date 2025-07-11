"use client";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/services/api';
import { Customer } from '@/types';
import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, User, Mail, Phone, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSelectorProps {
  value: string;
  onChange: (customerId: string, customerName: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSelector({ onChange, placeholder = "Search customers...", className }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  console.log(setSelectedCategory);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search will be handled by the query
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

//   const { data: customerCategories = [] } = useQuery({
//     queryKey: ['customerCategories'],
//     queryFn: async () => {
//       try {
//         const data = await getCustomerCategories();
//         return Array.isArray(data) ? data : [];
//       } catch (error) {
//         console.error('Error loading customer categories:', error);
//         return [];
//       }
//     },
//     staleTime: 1000 * 60 * 5,
//   });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', { search: searchTerm, limit: 50 }],
    queryFn: () => getCustomers({ search: searchTerm, limit: 50 }).then(res => res.data),
    staleTime: 1000,
    enabled: showDropdown,
  });

  // Filter customers by category
  const filteredCustomers = customers.filter((customer: Customer) => {
    if (selectedCategory === 'all') return true;
    return customer.categoryId === selectedCategory;
  });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    onChange(customer._id, customer.name);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    onChange('', '');
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
    
    if (!value) {
      setSelectedCustomer(null);
      onChange('', '');
      setShowDropdown(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="space-y-2">
        <div className="relative">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {selectedCustomer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Category Filter */}

      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto border rounded-lg bg-background shadow-lg">
          {isLoading && (
            <div className="p-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Searching customers...</p>
            </div>
          )}

          {!isLoading && filteredCustomers.length === 0 && (
            <div className="p-4 text-center">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No customers found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}

          {!isLoading && filteredCustomers.length > 0 && (
            <div className="py-2">
              {filteredCustomers.map((customer: Customer) => (
                <div
                  key={customer._id}
                  onClick={() => handleCustomerSelect(customer)}
                  className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-1">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {customer.categoryName && (
                        <Badge variant="outline" className="text-xs">
                          {customer.categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Customer Display */}
      {selectedCustomer && (
        <Card className="mt-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{selectedCustomer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCustomer.email && `${selectedCustomer.email} • `}
                    {selectedCustomer.phone}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 