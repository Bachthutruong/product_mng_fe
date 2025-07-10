"use client";

import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Order } from '@/types';
import type { Product } from '@/types';
import type { Customer } from '@/types';
import { getProducts, getCustomers, updateOrder } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const EditOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number(),
});

const EditOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  items: z.array(EditOrderItemSchema).min(1, "Order must have at least one item."),
  notes: z.string().optional(),
  status: z.string(),
  discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
  discountValueInput: z.string().optional(),
  shippingFeeInput: z.string().optional(),
});

type EditOrderFormValues = z.infer<typeof EditOrderSchema>;

interface EditOrderFormProps {
  order: Order;
}

export function EditOrderForm({ order }: EditOrderFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [productSearch, setProductSearch] = useState('');
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(EditOrderSchema),
    defaultValues: {
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: order.notes || '',
      status: order.status,
      discountType: (order as any).discountType || null,
      discountValueInput: (order as any).discountValue?.toString() || '',
      shippingFeeInput: (order as any).shippingFee?.toString() || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', { search: productSearch, limit: 20 }],
    queryFn: () => getProducts({ search: productSearch, limit: 20 }).then(res => res.data),
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers({ limit: 1000 }).then(res => res.data), // Fetch all customers
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Order>) => updateOrder(order._id, data),
    onSuccess: () => {
      toast({ title: "Order Updated", description: `Order ${order.orderNumber} has been successfully updated.` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order._id] });
      navigate('/orders');
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
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

  function onSubmit(data: EditOrderFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      return;
    }
    const submissionData = {
      ...data,
      status: data.status as Order['status'],
      totalAmount,
      discountAmount,
      shippingFee: data.shippingFeeInput ? parseFloat(data.shippingFeeInput) : 0,
      discountValue: data.discountValueInput ? parseFloat(data.discountValueInput) : 0,
    };
    mutation.mutate(submissionData);
  }

  if (isLoadingCustomers) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Order #{order.orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c: Customer) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Items</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Input value={field.productName} readOnly className="flex-1" />
                  <Controller
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => {
                            const rawValue = e.target.value;
                            const parsedValue = parseInt(rawValue, 10);
                            field.onChange(rawValue === '' ? '' : (isNaN(parsedValue) ? 1 : parsedValue));
                            setForceUpdateCounter(c => c + 1);
                        }}
                        onBlur={(e) => {
                            field.onBlur();
                            const rawValue = e.target.value;
                            const parsedValue = parseInt(rawValue, 10);
                            if (rawValue === '' || isNaN(parsedValue) || parsedValue < 1) {
                                field.onChange(1);
                                setForceUpdateCounter(c => c + 1);
                            }
                        }}
                        className="w-20"
                      />
                    )}
                  />
                  <Input value={formatCurrency(field.unitPrice)} readOnly className="w-24" />
                  <Button type="button" variant="ghost" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
               <FormLabel>Add Product</FormLabel>
               <div className="flex space-x-2">
                  <Input 
                    placeholder="Search for products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
               </div>
               {isLoadingProducts && <Loader2 className="h-4 w-4 animate-spin" />}
               <div className="max-h-40 overflow-y-auto border rounded-md">
                {products?.map((p: Product) => (
                  <div key={p._id} onClick={() => addProduct(p)} className="p-2 hover:bg-muted cursor-pointer">
                    {p.name} ({formatCurrency(p.price)}) - Stock: {p.stock}
                  </div>
                ))}
               </div>
            </div>

            <div className="text-right font-semibold">Subtotal: {formatCurrency(subtotal)}</div>

            {/* Discount and Shipping Section */}
            <Card className="p-4 bg-muted/30">
                <FormLabel className="text-base font-medium">折扣與運費</FormLabel>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
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
                            min="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-4">
                  <FormLabel>運費</FormLabel>
                  <div className="mt-2">
                    <FormField
                      control={form.control}
                      name="shippingFeeInput"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">運費 ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="例如：5.00"
                              {...field}
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
            </Card>

            <div className="text-right font-bold text-lg">Total: {formatCurrency(totalAmount)}</div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Order notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <CardFooter className="flex justify-end gap-2 p-0 pt-6">
              <Button type="button" variant="ghost" onClick={() => navigate('/orders')}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Order
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 