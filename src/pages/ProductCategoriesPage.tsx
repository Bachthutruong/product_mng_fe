import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle, Edit3, Trash2, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Category } from "@/types";
import { formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const CategorySchema = z.object({
  name: z.string().min(1, "名稱是必需的"),
  description: z.string().optional(),
});
type CategoryFormData = z.infer<typeof CategorySchema>;

const CategoryForm = ({ category, onSave, onCancel, isLoading }: { category?: Category | null, onSave: (data: CategoryFormData) => void, onCancel: () => void, isLoading: boolean }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CategoryFormData>({
    resolver: zodResolver(CategorySchema),
  });

  React.useEffect(() => {
    reset({ name: category?.name || "", description: category?.description || "" });
  }, [category, reset]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <Label htmlFor="name">分類名稱</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
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

export default function ProductCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories, isLoading, isError, error } = useQuery({
    queryKey: ['productCategories', searchTerm],
    queryFn: () => getProductCategories(searchTerm),
  });

  const createMutation = useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => {
      toast({ title: "成功", description: "分類已建立。" });
      queryClient.invalidateQueries({ queryKey: ['productCategories'] });
      setIsFormOpen(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "建立分類失敗。" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; category: CategoryFormData }) => updateProductCategory(data.id, data.category),
    onSuccess: () => {
      toast({ title: "成功", description: "分類已更新。" });
      queryClient.invalidateQueries({ queryKey: ['productCategories'] });
      setIsFormOpen(false);
      setSelectedCategory(null);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "更新分類失敗。" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      toast({ title: "成功", description: "分類已刪除。" });
      queryClient.invalidateQueries({ queryKey: ['productCategories'] });
      setIsDeleteConfirmOpen(false);
      setSelectedCategory(null);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "刪除分類失敗。" }),
  });

  const handleSave = (data: CategoryFormData) => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory._id, category: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openForm = (category: Category | null = null) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };
  
  const openDeleteConfirm = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><FolderTree /> 分類管理</h1>
          </div>
          <Button onClick={() => { setSelectedCategory(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> 添加分類
          </Button>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>過濾 & 搜尋分類</CardTitle>
              <CardDescription>{categories?.length || 0} 個分類已找到。</CardDescription>
          </CardHeader>
          <CardContent>
              <Input placeholder="按名稱搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>分類列表</CardTitle><CardDescription>管理您的產品分類。</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : isError ? (
            <div className="text-red-500">Error: {error.message}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>建立時間</TableHead>
                  <TableHead>更新時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Skeleton className="h-8 w-8 inline-block" />
                        <Skeleton className="h-8 w-8 inline-block" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : categories?.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            找不到分類。
                        </TableCell>
                    </TableRow>
                ) : (
                  categories?.map((cat: Category) => (
                    <TableRow key={cat._id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.description || 'N/A'}</TableCell>
                      <TableCell>{formatToYYYYMMDDWithTime(new Date(cat.createdAt))}</TableCell>
                      <TableCell>{formatToYYYYMMDDWithTime(new Date(cat.updatedAt))}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openForm(cat)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(cat)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "編輯分類" : "新增分類"}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? "更新您的分類詳細資料。" : "填寫詳細資料以新增分類。"}
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
              此操作無法復原。這將永久刪除分類 "{selectedCategory?.name}"。
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