import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers, getCustomerCategories } from '@/services/api';
import { Customer } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, User, Mail, Phone, MapPin, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSelectorProps {
  value: string;
  onChange: (customerId: string, customerName: string) => void;
  placeholder?: string;
  className?: string;
  onAddNewCustomer?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function CustomerSelector({ value, onChange, placeholder = "Search customers...", className, onAddNewCustomer, searchValue, onSearchChange }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState(searchValue || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search will be handled by the query
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync with external value (when customer is created externally)
  useEffect(() => {
    if (value && !selectedCustomer) {
      // If we have a value but no selected customer, we need to find the customer
      // This will be handled by the parent component setting the searchTerm
    }
  }, [value, selectedCustomer]);

  // Sync with external values (when customer is created externally)
  useEffect(() => {
    console.log('CustomerSelector props:', { value, searchValue, selectedCustomer });
    
    // If we have both value and searchValue, it means a customer was selected externally
    if (value && searchValue) {
      console.log('Setting customer from external values:', { value, searchValue });
      setSearchTerm(searchValue);
      
      // Create a temporary customer object for display
      const tempCustomer: Customer = {
        _id: value,
        name: searchValue,
        phone: '',
        categoryId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSelectedCustomer(tempCustomer);
    } else if (!value && !searchValue) {
      // Reset when no customer is selected
      setSelectedCustomer(null);
      setSearchTerm('');
    }
  }, [value, searchValue]);

  const { data: customerCategories = [] } = useQuery({
    queryKey: ['customerCategories'],
    queryFn: async () => {
      try {
        const data = await getCustomerCategories({ page: 1, limit: 100 });
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        console.error('Error loading customer categories:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

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
    if (onSearchChange) {
      onSearchChange(customer.name);
    }
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
    if (onSearchChange) {
      onSearchChange(value);
    }
    setShowDropdown(true);
    
    if (!value) {
      setSelectedCustomer(null);
      onChange('', '');
      setShowDropdown(false);
    }
  };

  const handleAddNewCustomer = () => {
    if (onAddNewCustomer) {
      onAddNewCustomer();
      setShowDropdown(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="space-y-2">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {customerCategories.map((category: any) => (
              <SelectItem key={category._id} value={category._id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto border rounded-lg bg-background shadow-lg">
          {/* Add New Customer Button */}
          {onAddNewCustomer && (
            <div className="p-3 border-b border-dashed">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewCustomer}
                className="w-full flex items-center gap-2 text-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Add New Customer
              </Button>
            </div>
          )}

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