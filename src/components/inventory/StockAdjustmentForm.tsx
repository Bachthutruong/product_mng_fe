import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordStockAdjustment } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const StockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantityChange: z.coerce.number().int().refine(val => val !== 0, "Change cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});
type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

export function StockAdjustmentForm({ products }: { products: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<StockAdjustmentInput>({ resolver: zodResolver(StockAdjustmentSchema) });

  const mutation = useMutation({
    mutationFn: recordStockAdjustment,
    onSuccess: () => {
      toast({ title: "Success", description: "Stock adjustment recorded." });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset();
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.response?.data?.error }),
  });

  const onSubmit = (data: StockAdjustmentInput) => {
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Record Adjustment</CardTitle><CardDescription>Adjust stock for reasons like damage or loss.</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="productId" render={({ field }) => (
              <FormItem><FormLabel>Product</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a product..." /></SelectTrigger></FormControl>
                  <SelectContent>{products.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="quantityChange" render={({ field }) => (
              <FormItem><FormLabel>Quantity Change</FormLabel><FormControl><Input type="number" placeholder="-10 or 5" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem><FormLabel>Reason</FormLabel><FormControl><Input placeholder="e.g., Damaged goods" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : "Record Adjustment"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 