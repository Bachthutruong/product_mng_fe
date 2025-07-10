import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomerCategories, createCustomerCategory, updateCustomerCategory, deleteCustomerCategory } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CustomerCategory } from "@/types";
import { formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { useAuth } from "@/hooks/useAuth";

const CustomerCategorySchema = z.object({
  name: z.string().min(1, "名稱為必填項"),
  code: z.string().optional(),
  description: z.string().optional(),
});
type CategoryFormData = z.infer<typeof CustomerCategorySchema>;

const CategoryForm = ({ category, onSave, onCancel, isLoading }: { category?: CustomerCategory | null, onSave: (data: CategoryFormData) => void, onCancel: () => void, isLoading: boolean }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(CustomerCategorySchema),
    defaultValues: {
      name: category?.name || "",
      code: category?.code || "",
      description: category?.description || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <Label htmlFor="name">類別名稱</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="code">代碼</Label>
        <Input id="code" {...register("code")} placeholder="留白將自動生成" />
        {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">描述</Label>
        <Textarea id="description" {...register("description")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>取消</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "儲存"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function CustomerCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams({
    page: "1",
    limit: "10",
  });

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CustomerCategory | null>(null);

  const { data, isLoading, isError, error } = useQuery<{ data: CustomerCategory[], pagination: { total: number, page: number, limit: number, totalPages: number } }, Error, { data: CustomerCategory[], pagination: { total: number, page: number, limit: number, totalPages: number } }>({
    queryKey: ['customerCategories', page, limit],
    queryFn: () => getCustomerCategories({ page, limit }),
    placeholderData: (previousData) => previousData,
  });

  const categories = data?.data ?? [];
  const pagination = data?.pagination;

  const createMutation = useMutation({
    mutationFn: createCustomerCategory,
    onSuccess: () => {
      toast({ title: "成功", description: "類別已建立。" });
      queryClient.invalidateQueries({ queryKey: ['customerCategories'] });
      setIsFormOpen(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "建立類別失敗。" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; category: CategoryFormData }) => updateCustomerCategory(data.id, data.category),
    onSuccess: () => {
      toast({ title: "成功", description: "類別已更新。" });
      queryClient.invalidateQueries({ queryKey: ['customerCategories'] });
      setIsFormOpen(false);
      setSelectedCategory(null);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "更新類別失敗。" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerCategory,
    onSuccess: () => {
      toast({ title: "成功", description: "類別已刪除。" });
      queryClient.invalidateQueries({ queryKey: ['customerCategories'] });
      setIsDeleteConfirmOpen(false);
      setSelectedCategory(null);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "刪除類別失敗。" }),
  });

  const handleSave = (data: CategoryFormData) => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory._id, category: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openForm = (category: CustomerCategory | null = null) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };
  
  const openDeleteConfirm = (category: CustomerCategory) => {
    setSelectedCategory(category);
    setIsDeleteConfirmOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
        prev.set('page', String(newPage));
        return prev;
    }, { replace: true });
  };

  const handleLimitChange = (newLimit: string) => {
      setSearchParams(prev => {
          prev.set('limit', newLimit);
          prev.set('page', '1');
          return prev;
      }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">客戶類別</h1>
        <Button onClick={() => openForm()}>
          <PlusCircle className="mr-2 h-4 w-4" /> 新增類別
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>管理類別</CardTitle>
          <CardDescription>新增、編輯或刪除客戶類別。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名稱</TableHead>
                <TableHead>代碼</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead>更新時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: limit }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Skeleton className="h-8 w-8 inline-block" />
                      <Skeleton className="h-8 w-8 inline-block" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-red-500">
                    錯誤: {error.message}
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                          沒有找到任何類別。
                      </TableCell>
                  </TableRow>
              ) : (
                categories.map((cat: CustomerCategory) => (
                  <TableRow key={cat._id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.code}</TableCell>
                    <TableCell>{cat.description}</TableCell>
                    <TableCell>
                      <Badge variant={cat.isActive ? "default" : "secondary"}>
                        {cat.isActive ? "啟用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell>{cat.createdAt ? formatToYYYYMMDDWithTime(new Date(cat.createdAt)) : '-'}</TableCell>
                    <TableCell>{cat.updatedAt ? formatToYYYYMMDDWithTime(new Date(cat.updatedAt)) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openForm(cat)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(cat)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {pagination && pagination.total > 0 && (
            <CardFooter className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">每頁顯示</span>
                    <Select value={String(limit)} onValueChange={handleLimitChange}>
                        <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder={limit} />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (
                                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <PaginationControls
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  hasNextPage={page < pagination.totalPages}
                  hasPrevPage={page > 1}
                />
            </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "編輯類別" : "新增類別"}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? "更新您的類別詳細資訊。" : "請填寫詳細資訊以新增一個新類別。"}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm 
            category={selectedCategory}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>您確定嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。這將永久刪除 "{selectedCategory?.name}" 類別。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedCategory && deleteMutation.mutate(selectedCategory._id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "刪除中..." : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 