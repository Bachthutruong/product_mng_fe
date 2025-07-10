import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addUser } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

const UserSchema = z.object({
  name: z.string().min(1, "姓名為必填。"),
  email: z.string().email("無效的電子郵件地址。"),
  password: z.string().min(6, "密碼必須至少為 6 個字符。"),
  role: z.enum(["employee", "admin"]),
});

type UserFormData = z.infer<typeof UserSchema>;

export function AddUserDialog({ onUserAdded }: { onUserAdded: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      role: "employee",
    },
  });

  const mutation = useMutation({
    mutationFn: addUser,
    onSuccess: () => {
      toast({ title: "成功", description: "用戶已成功新增。" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onUserAdded();
      reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: error.response?.data?.error || "新增用戶失敗。",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          新增用戶
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增用戶</DialogTitle>
          <DialogDescription>
            填寫以下詳細資訊以創建新用戶。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">姓名</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">電子郵件</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">密碼</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="role">角色</Label>
            <Controller
                name="role"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="選擇一個角色" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="employee">員工</SelectItem>
                            <SelectItem value="admin">管理員</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              創建用戶
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 