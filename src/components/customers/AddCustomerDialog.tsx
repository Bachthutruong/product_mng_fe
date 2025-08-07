import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer, getCustomerCategories } from "@/services/api";
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

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "客戶姓名是必需的"),
  categoryId: z.string().min(1, "請選擇分類"),
  email: z.string().email("無效的電子郵件地址").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  customerCode: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

interface AddCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddCustomerDialog({ isOpen, onOpenChange }: AddCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      email: "",
      phone: "",
      address: "",
      customerCode: "",
      notes: "",
    },
  });
  
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['customerCategories'],
    // @ts-ignore
    queryFn: getCustomerCategories,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      toast({ title: "成功", description: "新客戶已建立。" });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "錯誤", description: error.response?.data?.error || "建立客戶失敗。" });
    }
  });

  const onSubmit = (data: CreateCustomerInput) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新增客戶</DialogTitle>
          <DialogDescription>
            填寫以下詳細資料以新增客戶。
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
                    <Input placeholder="John Doe" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories}>
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
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電話</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Add other fields as needed */}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "儲存客戶"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 