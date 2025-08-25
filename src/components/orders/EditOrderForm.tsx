"use client";

import React, { useState, useMemo } from 'react';
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
  productId: z.string().min(1, "產品是必需的。"),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "數量必須至少為 1。"),
  unitPrice: z.coerce.number(),
});

const EditOrderSchema = z.object({
  customerId: z.string().min(1, "客戶是必需的。"),
  items: z.array(EditOrderItemSchema).min(1, "訂單必須至少有一個項目。"),
  notes: z.string().optional(),
  status: z.string(),
  discountType: z.enum(['none', 'percentage', 'fixed']).optional(),
  discountValueInput: z.string().optional(),
  shippingFeeInput: z.string().optional(),
  storeShippingCostInput: z.string().optional(),
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
      discountType: (order as any).discountType || 'none',
      discountValueInput: (order as any).discountValue?.toString() || '',
      shippingFeeInput: (order as any).shippingFee?.toString() || '',
      storeShippingCostInput: (order as any).storeShippingCost?.toString() || '',
    },
  });

  // Reset form when order changes
  React.useEffect(() => {
    form.reset({
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: order.notes || '',
      status: order.status,
      discountType: (order as any).discountType || 'none',
      discountValueInput: (order as any).discountValue?.toString() || '',
      shippingFeeInput: (order as any).shippingFee?.toString() || '',
      storeShippingCostInput: (order as any).storeShippingCost?.toString() || '',
    });
  }, [order, form]);

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
    mutationFn: (data: EditOrderFormValues) => {
      // Transform form data to match backend expectations
      const transformedData = {
        customerId: data.customerId,
        items: data.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        notes: data.notes,
        status: data.status,
        discountType: data.discountType === 'none' ? null : data.discountType,
        discountValue: data.discountType === 'none' ? undefined : (data.discountValueInput ? parseFloat(data.discountValueInput) : undefined),
        shippingFee: data.shippingFeeInput ? parseFloat(data.shippingFeeInput) : undefined,
        storeShippingCost: data.storeShippingCostInput ? parseFloat(data.storeShippingCostInput) : undefined,
      };
      return updateOrder(order._id, transformedData);
    },
    onSuccess: () => {
      toast({ title: "訂單已更新", description: `訂單 ${order.orderNumber} 已成功更新。` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order._id] });
      navigate('/orders');
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error.response?.data?.error || "發生預期外的錯誤。"
      });
    },
  });

  const watchedItems = form.watch("items");
  const watchedDiscountType = form.watch("discountType");
  const watchedDiscountValueInput = form.watch("discountValueInput");
  const watchedShippingFeeInput = form.watch("shippingFeeInput");

  // Calculate totals
  const { subtotal, totalAmount } = useMemo(() => {
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
    // If discountType is 'none', discountAmount remains 0
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
      toast({ variant: "destructive", title: "認證錯誤", description: "您必須登入。" });
      return;
    }
    mutation.mutate(data);
  }

  if (isLoadingCustomers) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>更新訂單 #{order.orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>客戶</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇客戶" />
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>訂單狀態</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇狀態" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">待處理</SelectItem>
                      <SelectItem value="processing">處理中</SelectItem>
                      <SelectItem value="shipped">已出貨</SelectItem>
                      <SelectItem value="delivered">已送達</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="returned">已退貨</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>項目</FormLabel>
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-6">產品</div>
                <div className="col-span-2">數量</div>
                <div className="col-span-2">價格</div>
                <div className="col-span-1">總計</div>
                <div className="col-span-1"></div>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg">
                  <div className="col-span-6">
                    <div className="font-medium text-sm">{field.productName}</div>
                  </div>
                  <div className="col-span-2">
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
                          className="w-full text-xs"
                          min="1"
                        />
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <Controller
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <Input 
                          type="number"
                          {...field}
                          className="w-full text-xs"
                          min="0"
                          step="0.01"
                          onChange={(e) => {
                            const val = e.target.value;
                            const numVal = val === '' ? 0 : parseFloat(val);
                            field.onChange(numVal);
                            // Force re-calculation immediately
                            setForceUpdateCounter(prev => prev + 1);
                          }}
                        />
                      )}
                    />
                  </div>
                  <div className="col-span-1 font-medium text-xs">
                    {(() => {
                      const quantity = Number(form.watch(`items.${index}.quantity`) || 0);
                      const unitPrice = Number(form.watch(`items.${index}.unitPrice`) || 0);
                      return formatCurrency(quantity * unitPrice);
                    })()}
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
               <FormLabel>新增產品</FormLabel>
               <div className="flex space-x-2">
                  <Input 
                    placeholder="搜尋產品..."
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

            <div className="text-right font-semibold">小計: {formatCurrency(subtotal)}</div>

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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="選擇折扣類型" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">無折扣</SelectItem>
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
                            disabled={!watchedDiscountType || watchedDiscountType === 'none'}
                            min="0"
                            onChange={(e) => {
                              field.onChange(e);
                              setForceUpdateCounter(prev => prev + 1);
                            }}
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
                              onChange={(e) => {
                                field.onChange(e);
                                setForceUpdateCounter(prev => prev + 1);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
            </Card>

            <div className="text-right font-bold text-lg">總計: {formatCurrency(totalAmount)}</div>
            
            {/* Store Shipping Cost */}
            <Card className="p-4 bg-muted/30">
              <FormLabel className="text-base font-medium">商店運費成本</FormLabel>
              <div className="mt-2">
                <FormField
                  control={form.control}
                  name="storeShippingCostInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">商店運費成本 ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="商店支付的運費成本..."
                          {...field}
                          min="0"
                          step="0.01"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        商店支付的運費成本（供內部追蹤）
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>
            
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
            
            <CardFooter className="flex justify-end gap-2 p-0 pt-6">
              <Button type="button" variant="ghost" onClick={() => navigate('/orders')}>取消</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                更新訂單
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 