import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const UserEditSchema = z.object({
  fullName: z.string().min(1, "姓名是必需的"),
  role: z.enum(["admin", "employee"]),
});

export function EditUserDialog({ isOpen, onOpenChange, user }: { isOpen: boolean, onOpenChange: (open: boolean) => void, user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(UserEditSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      role: user?.role || "employee",
    },
  });

  useEffect(() => {
    form.reset({
      fullName: user?.fullName || "",
      role: user?.role || "employee",
    });
  }, [user, form]);
  
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof UserEditSchema>) => updateUser(user._id, data),
    onSuccess: () => {
      toast({ title: "用戶已更新" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: () => toast({ variant: "destructive", title: "更新失敗" }),
  });

  const onSubmit = (data: z.infer<typeof UserEditSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>編輯用戶: {user?.username}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem><FormLabel>姓名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>角色</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="admin">管理員</SelectItem>
                    <SelectItem value="employee">員工</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )}/>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={mutation.isPending}>儲存</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 