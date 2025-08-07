import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordStockIn } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const StockInSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  batchExpiryDate: z.string().min(1, "Expiry date is required"),
  notes: z.string().optional(),
});
type StockInInput = z.infer<typeof StockInSchema>;

export function StockInForm({ products }: { products: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<StockInInput>({ resolver: zodResolver(StockInSchema) });

  const mutation = useMutation({
    mutationFn: recordStockIn,
    onSuccess: () => {
      toast({ title: "Success", description: "Stock-in recorded." });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset();
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.response?.data?.error }),
  });

  const onSubmit = (data: StockInInput) => {
    mutation.mutate({ ...data, batchExpiryDate: new Date(data.batchExpiryDate) });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Record Stock-In</CardTitle><CardDescription>Add new inventory for a product.</CardDescription></CardHeader>
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
            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="batchExpiryDate" render={({ field }) => (
              <FormItem><FormLabel>Batch Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : "Record Stock-In"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 