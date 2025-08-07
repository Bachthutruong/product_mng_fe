import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomer, getCustomerCategories } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, MapPin } from 'lucide-react';

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "客戶姓名是必需的"),
  categoryId: z.string().min(1, "請選擇分類"),
  email: z.string().email("無效的電子郵件地址").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

interface AddCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCustomerCreated?: (customerId: string, customerName: string) => void;
}

export function AddCustomerDialog({ isOpen, onOpenChange, onCustomerCreated }: AddCustomerDialogProps) {
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
      notes: "",
    },
  });
  
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['customerCategories'],
    queryFn: async () => {
      try {
        const data = await getCustomerCategories({ page: 1, limit: 100 });
        console.log('Customer categories data:', data);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        console.error('Error loading customer categories:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data: any, variables: any) => {
      console.log('Customer created successfully:', data);
      console.log('Form variables:', variables);
      
      toast({ title: "成功", description: "新客戶已建立。" });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      // Call the callback with the new customer info
      if (onCustomerCreated) {
        console.log('API response data:', data);
        
        // Handle nested data structure: { success: true, data: {...} }
        const customerData = data.data || data;
        
        // Try different possible field names for customer name
        const customerName = customerData.name || customerData.customerName || customerData.fullName || customerData.customer?.name || variables.name || 'Unknown Customer';
        
        // Try different possible field names for customer ID - prioritize _id
        const customerId = customerData._id || customerData.id || customerData.customerId || customerData.customer?.id || customerData.customer?._id;
        
        console.log('Calling onCustomerCreated with:', { customerId, customerName });
        
        // Always use the customerId from API if available
        if (customerId) {
          onCustomerCreated(customerId, customerName);
        } else {
          console.error('No customerId found in API response:', data);
          toast({
            variant: "destructive",
            title: "錯誤",
            description: "無法從伺服器回應中取得客戶 ID。"
          });
        }
      }
      
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      toast({ 
        variant: "destructive", 
        title: "錯誤", 
        description: error.response?.data?.error || "建立客戶失敗。" 
      });
    }
  });

  const onSubmit = (data: CreateCustomerInput) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            新增客戶
          </DialogTitle>
          <DialogDescription>
            填寫以下客戶資訊。此客戶將被新增到您的系統中，並可在未來的訂單中選擇。
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    客戶姓名 *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="輸入客戶姓名" {...field} />
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
                  <FormLabel>分類 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇分類" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCategories ? (
                        <div className="p-2 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : (
                        categoriesData.map((category: any) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      電子郵件
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="customer@example.com" {...field} />
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
                    <FormLabel className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      電話
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 8900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    地址
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="輸入客戶地址" 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備註</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="關於此客戶的任何額外備註" 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            取消
          </Button>
          <Button 
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            建立客戶
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 