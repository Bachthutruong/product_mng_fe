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
  name: z.string().min(1, "Customer name is required"),
  categoryId: z.string().min(1, "Please select a category"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
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
      
      toast({ title: "Success", description: "New customer has been created." });
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
            title: "Error",
            description: "Failed to get customer ID from server response."
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
        title: "Error", 
        description: error.response?.data?.error || "Failed to create customer." 
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
            Add New Customer
          </DialogTitle>
          <DialogDescription>
            Fill in the customer information below. This customer will be added to your system and can be selected for future orders.
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
                    Customer Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
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
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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
                      Email
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
                      Phone
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
                    Address
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter customer address" 
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about this customer" 
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
            Cancel
          </Button>
          <Button 
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 