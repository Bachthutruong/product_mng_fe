import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Loader2, Edit3 } from "lucide-react";
import { User } from "@/types";

const UserEditSchema = z.object({
  name: z.string().min(1, "姓名是必需的"),
  email: z.string().email("無效的電子郵件地址"),
  role: z.enum(["admin", "employee"]),
});

type UserEditFormData = z.infer<typeof UserEditSchema>;

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated?: () => void;
}

export function EditUserDialog({ isOpen, onOpenChange, user, onUserUpdated }: EditUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<UserEditFormData>({
    resolver: zodResolver(UserEditSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "employee",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
  }, [user, form, isOpen]);
  
  const mutation = useMutation({
    mutationFn: (data: UserEditFormData) => {
      if (!user) throw new Error("No user selected");
      return updateUser(user._id, data);
    },
    onSuccess: () => {
      toast({ title: "成功", description: "用戶資料已更新" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onUserUpdated?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "更新失敗", 
        description: error.response?.data?.error || "更新用戶資料時發生錯誤" 
      });
    },
  });

  const onSubmit = (data: UserEditFormData) => {
    mutation.mutate(data);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            編輯用戶
          </DialogTitle>
          <DialogDescription>
            更新用戶 {user.name} 的詳細資料。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">管理員</SelectItem>
                      <SelectItem value="employee">員工</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  "儲存變更"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 