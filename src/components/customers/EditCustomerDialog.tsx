import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer, getCustomerCategories } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const UpdateCustomerSchema = z.object({
  name: z.string().min(1, "客戶姓名是必需的"),
  categoryId: z.string().min(1, "請選擇分類"),
  email: z.string().email("無效的電子郵件地址").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  customerCode: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

interface EditCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customer: any;
}

export function EditCustomerDialog({ isOpen, onOpenChange, customer }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<UpdateCustomerInput>({
    resolver: zodResolver(UpdateCustomerSchema),
    defaultValues: {
      name: customer?.name || "",
      categoryId: customer?.categoryId || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
      customerCode: customer?.customerCode || "",
      notes: customer?.notes || "",
    },
  });
  
  useEffect(() => {
    if (customer) {
      form.reset(customer);
    }
  }, [customer, form]);

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['customerCategories'],
    // @ts-ignore
    queryFn: getCustomerCategories,
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateCustomerInput) => updateCustomer({ id: customer._id, customerData: data }),
    onSuccess: () => {
      toast({ title: "成功", description: "客戶詳細資料已更新。" });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "錯誤", description: error.response?.data?.error || "更新客戶失敗。" });
    }
  });

  const onSubmit = (data: UpdateCustomerInput) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>編輯客戶</DialogTitle>
          <DialogDescription>
            更新以下客戶詳細資料。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>客戶姓名</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分類</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇分類" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* @ts-ignore */}
                        {categoriesData?.data?.map((cat: any) => (
                          <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電子郵件</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "儲存變更"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 