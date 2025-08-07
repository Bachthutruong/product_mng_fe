"use client";
import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { Product } from '@/types';
import { createOrder } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowLeft, User, Package, Calculator, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CustomerSelector } from '@/components/orders/CustomerSelector';
import { ProductSelector } from '@/components/orders/ProductSelector';
import { AddCustomerDialog } from '@/components/orders/AddCustomerDialog';

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

export default function CreateOrderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [customerDisplayValue, setCustomerDisplayValue] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  
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

  // Load draft from localStorage on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('order-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        form.reset(draft);
        setCustomerDisplayValue(draft.customerDisplayValue || '');
        setIsDraftSaved(true);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [form]);

  // Save draft to localStorage whenever form changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      const draft = {
        ...value,
        customerDisplayValue,
        timestamp: Date.now()
      };
      localStorage.setItem('order-draft', JSON.stringify(draft));
      setIsDraftSaved(true);
    });
    return () => subscription.unsubscribe();
  }, [form, customerDisplayValue]);

  const mutation = useMutation({
    mutationFn: (data: any) => createOrder(data),
    onSuccess: (data: any) => {
      toast({ title: "Order Created", description: `Order ${data.orderNumber} has been successfully created.` });
      queryClient.invalidateQueries({queryKey: ['orders']});
      // Clear draft after successful creation
      localStorage.removeItem('order-draft');
      setIsDraftSaved(false);
      navigate('/orders');
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
    setShowProductDropdown(false);
  };

  const handleAddNewCustomer = () => {
    setShowAddCustomerDialog(true);
  };

  const handleCustomerCreated = (customerId: string, customerName: string) => {
    console.log('Customer created:', { customerId, customerName });
    
    if (!customerId || !customerName) {
      console.error('Invalid customer data:', { customerId, customerName });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get customer information after creation."
      });
      return;
    }
    
    // Set the form values with real customer data
    form.setValue('customerId', customerId);
    setCustomerDisplayValue(customerName);
    
    // Force re-render of CustomerSelector
    setForceUpdateCounter(prev => prev + 1);
    
    toast({ 
      title: "Customer Added", 
      description: `${customerName} has been added and selected for this order.` 
    });
  };



  const clearDraft = () => {
    localStorage.removeItem('order-draft');
    setIsDraftSaved(false);
    form.reset();
    setCustomerDisplayValue('');
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

  return (
    <div className="container mx-auto py-4 px-2 space-y-4 sm:py-6 sm:px-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-base sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Create New Order</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Fill in the details below to create a new order</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {isDraftSaved && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs sm:text-sm">
              <Save className="h-3 w-3" />
              Draft Saved
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearDraft}
            disabled={!isDraftSaved}
            className="text-xs sm:text-sm"
          >
            Clear Draft
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Customer & Products */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Customer Selection */}
              <Card className="w-full">
                <CardHeader className="px-3 py-2 sm:px-6 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 py-2 sm:px-6 sm:py-4">
                  <div className="space-y-2">
                    <FormLabel className="flex items-center gap-1 text-base sm:text-lg">
                      Customer
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <CustomerSelector
                      key={`customer-selector-${forceUpdateCounter}`}
                      value={form.watch('customerId')}
                      onChange={(customerId, customerName) => {
                        form.setValue('customerId', customerId);
                        setCustomerDisplayValue(customerName);
                      }}
                      placeholder="Search for customers..."
                      onAddNewCustomer={handleAddNewCustomer}
                      searchValue={customerDisplayValue}
                      onSearchChange={setCustomerDisplayValue}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card className="w-full">
                <CardHeader className="px-3 py-2 sm:px-6 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Package className="h-5 w-5" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 py-2 sm:px-6 sm:py-4">
                  {/* Current Items */}
                  {fields.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="grid grid-cols-12 gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
                        <div className="col-span-6">Product</div>
                        <div className="col-span-2">Quantity</div>
                        <div className="col-span-2">Price</div>
                        <div className="col-span-1">Total</div>
                        <div className="col-span-1"></div>
                      </div>
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-1 sm:gap-2 items-center p-2 sm:p-3 border rounded-lg">
                          <div className="col-span-6">
                            <div className="font-medium text-xs sm:text-base">{field.productName}</div>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              {...form.register(`items.${index}.quantity`)}
                              className="w-full text-xs sm:text-base"
                              min="1"
                              onChange={(e) => {
                                const val = e.target.value;
                                const numVal = val === '' ? 1 : parseInt(val, 10);
                                form.setValue(`items.${index}.quantity`, numVal);
                                // Force re-calculation immediately
                                setForceUpdateCounter(prev => prev + 1);
                              }}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input 
                              value={formatCurrency(field.unitPrice)} 
                              readOnly 
                              className="w-full bg-muted text-xs sm:text-base" 
                            />
                          </div>
                          <div className="col-span-1 font-medium text-xs sm:text-base">
                            {formatCurrency((Number(field.quantity) || 0) * (Number(field.unitPrice) || 0))}
                          </div>
                          <div className="col-span-1">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Product */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowProductDropdown(!showProductDropdown)}
                        className="flex items-center gap-2 text-xs sm:text-base"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add Product
                      </Button>
                      {fields.length > 0 && (
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {fields.length} item{fields.length !== 1 ? 's' : ''} in order
                        </span>
                      )}
                    </div>
                    
                    {showProductDropdown && (
                      <ProductSelector
                        onProductSelect={addProduct}
                        placeholder="Search products..."
                        className="relative"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="w-full">
                <CardHeader className="px-3 py-2 sm:px-6 sm:py-4">
                  <CardTitle className="text-lg sm:text-xl">Order Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-3 py-2 sm:px-6 sm:py-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any special instructions or notes for this order..." 
                            {...field} 
                            rows={3}
                            className="text-xs sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Pricing & Actions */}
            <div className="space-y-4 sm:space-y-6">
              {/* Pricing Summary */}
              <Card className="w-full">
                <CardHeader className="px-3 py-2 sm:px-6 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Calculator className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 py-2 sm:px-6 sm:py-4">
                  {/* Discount */}
                  <div className="space-y-2">
                    <FormLabel className="text-base sm:text-lg">Discount</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
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
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                {...field}
                                disabled={!watchedDiscountType}
                                min="0"
                                step="0.01"
                                className="text-xs sm:text-base"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Shipping */}
                  <FormField
                    control={form.control}
                    name="shippingFeeInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base sm:text-lg">Shipping Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            min="0"
                            step="0.01"
                            className="text-xs sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Summary */}
                  <div className="space-y-2 pt-2 sm:pt-4 border-t">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {watchedDiscountType && parseFloat(watchedDiscountValueInput || '0') > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {parseFloat(watchedShippingFeeInput || '0') > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-blue-600">
                        <span>Shipping:</span>
                        <span>+{formatCurrency(parseFloat(watchedShippingFeeInput || '0'))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="w-full">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="space-y-2 sm:space-y-3">
                    <Button 
                      type="submit"
                      className="w-full text-base sm:text-lg"
                      disabled={mutation.isPending || fields.length === 0}
                      size="lg"
                    >
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Order
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full text-base sm:text-lg"
                      onClick={() => navigate('/orders')}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        isOpen={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
} 