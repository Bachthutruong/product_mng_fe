import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordStockIn, recordStockAdjustment } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Product } from "@/types";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const formSchema = z.object({
  productId: z.string().min(1, "產品為必填項。"),
  operationType: z.enum(["stock-in", "adjustment"]),
  quantity: z.coerce.number().int(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  batchExpiryDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryOperationFormProps {
  products: Product[];
}

export function InventoryOperationForm({ products }: InventoryOperationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      operationType: "stock-in",
      quantity: 0,
      reason: "",
      notes: "",
    },
  });

  const operationType = form.watch("operationType");

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (data.operationType === "stock-in") {
        return recordStockIn({
          productId: data.productId,
          quantity: data.quantity,
          notes: data.notes,
          batchExpiryDate: data.batchExpiryDate,
        });
      } else {
        return recordStockAdjustment({
          productId: data.productId,
          quantityChange: data.quantity,
          reason: data.reason,
          notes: data.notes,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "成功", description: "庫存操作已成功記錄。" });
      queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: error.response?.data?.error || "無法記錄操作。",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>庫存操作</CardTitle>
        <CardDescription>記錄新的入庫或調整。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>產品</FormLabel>
                     <SearchableSelect
                        placeholder="選擇一個產品"
                        searchPlaceholder="搜尋產品..."
                        emptyMessage="找不到產品"
                        items={products.map(p => ({ value: p._id, label: p.name }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>操作類型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="選擇一個操作類型" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stock-in">入庫</SelectItem>
                        <SelectItem value="adjustment">調整</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {operationType === 'stock-in' ? '入庫數量' : '數量變更'}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="例如：100 或 -20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {operationType === 'stock-in' ? (
                <FormField
                  control={form.control}
                  name="batchExpiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                       <FormLabel>批次效期 (可選)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>選擇一個日期</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>原因</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="選擇一個原因" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="damaged">商品損壞</SelectItem>
                          <SelectItem value="stock_correction">庫存修正</SelectItem>
                          <SelectItem value="theft">失竊</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>備註 (可選)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="新增任何相關備註..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "記錄中..." : "記錄操作"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 