"use client";
import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { Product, Customer } from '@/types';
import { getProducts, getCustomers, getCustomerCategories, createOrder } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const CreateOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number(),
});

const CreateOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  customerCategoryId: z.string(),
  items: z.array(CreateOrderItemSchema).min(1, "Order must have at least one item."),
  notes: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
  discountValueInput: z.string().optional(),
  shippingFeeInput: z.string().optional(),
});

type CreateOrderFormValues = z.infer<typeof CreateOrderSchema>;

export interface CreateOrderFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CreateOrderForm({ isOpen, onOpenChange }: CreateOrderFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDisplayValue, setCustomerDisplayValue] = useState('');
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(CreateOrderSchema),
    defaultValues: {
      customerId: '',
      customerCategoryId: 'all',
      items: [],
      notes: '',
      discountType: null,
      discountValueInput: '',
      shippingFeeInput: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: customerCategories = [] } = useQuery({
    queryKey: ['customerCategories'],
    queryFn: async () => {
      console.log('Starting customer categories fetch...');
      try {
        const data = await getCustomerCategories();
        console.log('Raw customer categories data:', data);
        if (!Array.isArray(data)) {
          console.error('Received non-array data:', data);
          return [];
        }
        return data;
      } catch (error) {
        console.error('Error in customer categories query:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load customer categories"
        });
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    console.log('Customer categories updated:', customerCategories);
  }, [customerCategories]);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomerSearch(customerDisplayValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [customerDisplayValue]);

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', { search: productSearch, limit: 20 }],
    queryFn: () => getProducts({ search: productSearch, limit: 20 }).then(res => res.data),
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', { search: customerSearch, limit: 20 }],
    queryFn: () => getCustomers({ search: customerSearch, limit: 20 }).then(res => res.data),
    staleTime: 1000 // Prevent unnecessary refetches
  });

  // const   handleCustomerSelect = (customer: Customer) => {
  //   if (customer._id) {
  //     form.setValue('customerId', customer._id);
  //     setCustomerDisplayValue(customer.name); // Set search to customer name
  //   }
  // };

  const mutation = useMutation({
    mutationFn: (data: any) => createOrder(data), // Adjusted for new fields
    onSuccess: (data: any) => {
      toast({ title: "Order Created", description: `Order ${data.orderNumber} has been successfully created.` });
      queryClient.invalidateQueries({queryKey: ['orders']});
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.response?.data?.error || "An unexpected error occurred."
      });
    },
  });

  const watchedItems = form.watch("items");
  const watchedDiscountType = form.watch("discountType");
  const watchedDiscountValueInput = form.watch("discountValueInput");
  const watchedShippingFeeInput = form.watch("shippingFeeInput");

  const { subtotal, discountAmount, totalAmount } = useMemo(() => {
    const currentSubtotal = watchedItems.reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return acc + (quantity * price);
    }, 0);

    let currentDiscountAmount = 0;
    const discountValue = parseFloat(watchedDiscountValueInput || '0');
    if (watchedDiscountType === 'percentage' && discountValue > 0) {
      currentDiscountAmount = (currentSubtotal * discountValue) / 100;
    } else if (watchedDiscountType === 'fixed' && discountValue > 0) {
      currentDiscountAmount = discountValue;
    }
    currentDiscountAmount = Math.max(0, Math.min(currentDiscountAmount, currentSubtotal));
    
    const shipping = parseFloat(watchedShippingFeeInput || '0') || 0;
    const currentTotalAmount = currentSubtotal - currentDiscountAmount + shipping;

    return {
      subtotal: currentSubtotal,
      discountAmount: currentDiscountAmount,
      totalAmount: currentTotalAmount,
    };
  }, [watchedItems, watchedDiscountType, watchedDiscountValueInput, watchedShippingFeeInput, forceUpdateCounter]);

  const addProduct = (product: Product) => {
    append({
      productId: product._id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
    });
  };

  function onSubmit(data: CreateOrderFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      return;
    }
    const submissionData = {
      ...data,
      totalAmount,
      discountAmount,
      shippingFee: data.shippingFeeInput ? parseFloat(data.shippingFeeInput) : 0,
      discountValue: data.discountValueInput ? parseFloat(data.discountValueInput) : 0
    };
    mutation.mutate(submissionData);
  }

  if (isLoadingCustomers) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-muted-foreground" />
              <DialogTitle>新增訂單</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            選擇客戶、新增商品，並指定折扣或運費。
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Customer Category */}
              {/* <FormField
                control={form.control}
                name="customerCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客戶分類 (可選擇，若無則顯示全部)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇客戶分類 (可留空顯示全部)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        {customerCategories && customerCategories.length > 0 && customerCategories.map((category: any) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              {/* Customer Search */}
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-1">
                  客戶
                  <span className="text-destructive">*</span>
                </FormLabel>
                <div className="space-y-2">
                  <Input 
                    placeholder="Search for customers..." 
                    value={customerDisplayValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomerDisplayValue(value);
                      if (!value) {
                        form.setValue('customerId', '');
                      }
                    }}
                  />
                </div>
                {isLoadingCustomers && <Loader2 className="h-4 w-4 animate-spin" />}
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {customers?.map((customer: Customer) => (
                    <div 
                      key={customer._id} 
                      onClick={() => {
                        if (customer._id) {
                          form.setValue('customerId', customer._id);
                          setCustomerDisplayValue(customer.name);
                        }
                      }}
                      className={`p-2 hover:bg-muted cursor-pointer ${
                        form.watch('customerId') === customer._id ? 'bg-muted' : ''
                      }`}
                    >
                      {customer.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                <FormLabel>訂單明細</FormLabel>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Input value={field.productName} readOnly className="flex-1" />
                    <Input
                      type="number"
                      {...form.register(`items.${index}.quantity`)}
                      className="w-20"
                      onChange={(e) => {
                        const val = e.target.value;
                        const numVal = val === '' ? 1 : parseInt(val, 10);
                        form.setValue(`items.${index}.quantity`, numVal);
                        setForceUpdateCounter(c => c + 1);
                      }}
                    />
                    <Input value={formatCurrency(field.unitPrice)} readOnly className="w-24" />
                    <Button type="button" variant="ghost" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                {/* Add Product Search */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {}}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      新增產品到訂單
                    </Button>
                  </div>
                  <Input
                    placeholder="搜尋產品..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {isLoadingProducts && <Loader2 className="h-4 w-4 animate-spin" />}
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {products?.map((p: Product) => (
                      <div
                        key={p._id}
                        onClick={() => addProduct(p)}
                        className="p-2 hover:bg-muted cursor-pointer"
                      >
                        {p.name} ({formatCurrency(p.price)}) - Stock: {p.stock}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Discount and Shipping */}
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">折扣與運費</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>折扣類型</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="選擇折扣類型" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">百分比 (%)</SelectItem>
                            <SelectItem value="fixed">固定金額 ($)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountValueInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>折扣金額</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="例如：10 或 5.50"
                            {...field}
                            disabled={!watchedDiscountType}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="shippingFeeInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>運費</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="例如：5.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Order Summary */}
              <div className="space-y-2 text-right">
                <div className="text-sm">
                  小計: {formatCurrency(subtotal)}
                </div>
                {watchedDiscountType && parseFloat(watchedDiscountValueInput || '0') > 0 && (
                  <div className="text-sm text-green-600">
                    折扣: -{formatCurrency(discountAmount)}
                  </div>
                )}
                {parseFloat(watchedShippingFeeInput || '0') > 0 && (
                  <div className="text-sm text-blue-600">
                    運費: +{formatCurrency(parseFloat(watchedShippingFeeInput || '0'))}
                  </div>
                )}
                <div className="text-lg font-bold">
                  總計: {formatCurrency(totalAmount)}
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Textarea placeholder="訂單備註..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            建立訂單
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 