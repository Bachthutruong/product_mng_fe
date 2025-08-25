import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct, getProductCategories, createProduct, updateProduct, uploadProductImages } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, PlusCircle, Edit3, Trash2, ImageOff, Search, X, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatToYYYYMMDD } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { keepPreviousData } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Product, Category } from "@/types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { DatePickerCalendar } from "@/components/ui/enhanced-calendar";
import { Link } from "react-router-dom";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { deleteProductImage } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

const ProductFormSchema = z.object({
  name: z.string().min(1, "產品名稱是必需的"),
  sku: z.string().optional(),
  categoryId: z.string().min(1, "分類是必需的"),
  price: z.coerce.number().min(0, "價格必須是非負數"),
  cost: z.coerce.number().min(0, "成本必須是非負數").optional(),
  stock: z.coerce.number().int("庫存必須是整數").min(0, "庫存必須是非負數"),
  unit: z.string().optional(),
  lowStockThreshold: z.coerce.number().int().min(0),
  expiryDate: z.date({ required_error: "到期日期是必需的" }),
  description: z.string().optional(),
  discontinued: z.boolean().default(false),
});
type ProductFormData = z.infer<typeof ProductFormSchema>;

const ProductFormDialog = ({
  isOpen, onOpenChange, product, categories
}: {
  isOpen: boolean; onOpenChange: (isOpen: boolean) => void; product: Product | null; categories: Category[]
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditMode = !!product;
  const isAdmin = user?.role === 'admin';

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(ProductFormSchema),
  });

  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && product) {
        reset({
          ...product,
          price: product.price ?? 0,
          cost: product.cost ?? 0,
          stock: product.stock ?? 0,
          lowStockThreshold: product.lowStockThreshold ?? 0,
          expiryDate: new Date(product.expiryDate),
          discontinued: product.discontinued ?? false,
        });
      } else {
        reset({
          name: '', sku: '', categoryId: '', price: 0, cost: 0,
          stock: 0, unit: '', lowStockThreshold: 0,
          description: '', discontinued: false,
          expiryDate: new Date()
        });
      }
    }
  }, [isOpen, product, isEditMode, reset]);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
        const productResponse = isEditMode
            ? await updateProduct({ id: product!._id, productData: data })
            : await createProduct(data);

        const productId = productResponse.data._id;
        
        if (filesToUpload.length > 0) {
            const formData = new FormData();
            filesToUpload.forEach(file => formData.append('images', file));
            await uploadProductImages({ id: productId, formData });
        }
        return productResponse;
    },
    onSuccess: () => {
      toast({ title: "成功", description: `產品已成功${isEditMode ? '更新' : '新增'}` });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productCategories'] }); // Invalidate categories query
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "操作失敗" }),
  });

  const onRemoveExisting = (publicId: string) => {
    // Implement delete mutation logic here
    // This is simplified, you'd use useMutation like for create/update
    deleteProductImage({ productId: product!._id, imageId: publicId })
        .then(() => {
            toast({ title: "成功", description: "圖片已刪除。" });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', product!._id] });
        })
        .catch(() => toast({ variant: "destructive", title: "錯誤", description: "刪除圖片失敗。" }));
};

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PlusCircle /> {isEditMode ? '編輯產品' : '新增產品'}</DialogTitle>
          <DialogDescription>填寫產品詳細資訊，完成後點擊「{isEditMode ? '儲存變更' : '新增產品'}」。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">產品名稱</Label>
                <Input id="name" {...register("name")} placeholder="例如：超級小部件" />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register("sku")} placeholder="例如：SW-001" />
            </div>
            <div className="space-y-2">
                <Label>分類</Label>
                 <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdmin}>
                            <SelectTrigger><SelectValue placeholder="選擇一個分類" /></SelectTrigger>
                            <SelectContent>{categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                />
                {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="price">價格</Label>
                <Input id="price" type="number" {...register("price")} disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="cost">成本</Label>
                <Input id="cost" type="number" {...register("cost")} disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="stock">庫存數量</Label>
                <Input id="stock" type="number" {...register("stock")} disabled={!isAdmin} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="unit">計量單位</Label>
                <Input id="unit" {...register("unit")} placeholder="例如：個、盒、公斤" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">低庫存閥值</Label>
                <Input id="lowStockThreshold" type="number" {...register("lowStockThreshold")} />
            </div>
            <div className="space-y-2">
                <Label>到期日期 (必填)</Label>
                <Controller
                    name="expiryDate"
                    control={control}
                    render={({ field }) => (
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, 'PPP') : <span>選擇日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <DatePickerCalendar
                                    selected={field.value}
                                    onSelect={field.onChange}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                {errors.expiryDate && <p className="text-red-500 text-sm">{errors.expiryDate.message}</p>}
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="description">描述 (選填)</Label>
                <Textarea id="description" {...register("description")} placeholder="輸入產品的簡要描述..." />
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-2">
                <div className="flex items-center space-x-2">
                    <Controller
                        name="discontinued"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="discontinued"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <Label htmlFor="discontinued">已停售</Label>
                </div>
                <p className="text-sm text-muted-foreground">勾選此選項表示產品已停止銷售</p>
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-2">
                <Label>產品圖片</Label>
                <ImageUploader 
                    onFilesChange={setFilesToUpload}
                    existingImages={product?.images}
                    onRemoveExistingImage={isEditMode && product ? onRemoveExisting : undefined}
                />
            </div>

            <DialogFooter className="col-span-1 md:col-span-2">
                 <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? '儲存變更' : '新增產品')}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Add pageSize state
  const [appliedFilters, setAppliedFilters] = useState({ search: "", categoryId: "all", stockStatus: "all", discontinued: "all" });
  const [localFilters, setLocalFilters] = useState({ search: "", categoryId: "all", stockStatus: "all", discontinued: "all" });
  
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, appliedFilters, pageSize], // Add pageSize to queryKey
    queryFn: () => getProducts({ 
      page, 
      limit: pageSize, 
      search: appliedFilters.search,
      categoryId: appliedFilters.categoryId === 'all' ? undefined : appliedFilters.categoryId,
      stockStatus: appliedFilters.stockStatus === 'all' ? undefined : appliedFilters.stockStatus,
      discontinued: appliedFilters.discontinued === 'all' ? undefined : appliedFilters.discontinued,
    }), // Use pageSize in query
    placeholderData: keepPreviousData,
  });

  const { data: categoriesData } = useQuery<Category[]>({ 
    queryKey: ['productCategories'], 
    queryFn: () => getProductCategories()
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast({ title: "成功", description: "產品已成功刪除。" });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "刪除產品失敗。" }),
  });

  const products = data?.data || [];
  const totalProducts = data?.pagination?.totalItems || 0;
  
  const handleApplyFilters = () => {
      setPage(1);
      setAppliedFilters(localFilters);
  };
  
  const handleClearFilters = () => {
      const defaultFilters = { search: "", categoryId: "all", stockStatus: "all", discontinued: "all" };
      setPage(1);
      setLocalFilters(defaultFilters);
      setAppliedFilters(defaultFilters);
  };

  const TableSkeleton = () => (
    Array.from({ length: pageSize }).map((_, index) => ( // Use pageSize for skeleton
      <TableRow key={index}>
        <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold">產品</h1>
                <p className="text-muted-foreground">優化您的商品清單，{totalProducts} 個商品已找到。</p>
            </div>
            <Button onClick={() => { setSelectedProduct(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> 新增產品
            </Button>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>篩選與搜尋產品</CardTitle>
                <CardDescription>使用下面的選項來縮小您的產品列表。</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Quick Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                        variant={appliedFilters.discontinued === "all" && appliedFilters.stockStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setLocalFilters(f => ({...f, discontinued: "all", stockStatus: "all"}));
                            setAppliedFilters(f => ({...f, discontinued: "all", stockStatus: "all"}));
                        }}
                    >
                        所有產品
                    </Button>
                    <Button
                        variant={appliedFilters.discontinued === "false" && appliedFilters.stockStatus === "inStock" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setLocalFilters(f => ({...f, discontinued: "false", stockStatus: "inStock"}));
                            setAppliedFilters(f => ({...f, discontinued: "false", stockStatus: "inStock"}));
                        }}
                    >
                        產品還庫存
                    </Button>
                    <Button
                        variant={appliedFilters.discontinued === "false" && appliedFilters.stockStatus === "out-of-stock" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setLocalFilters(f => ({...f, discontinued: "false", stockStatus: "out-of-stock"}));
                            setAppliedFilters(f => ({...f, discontinued: "false", stockStatus: "out-of-stock"}));
                        }}
                    >
                        產品缺貨
                    </Button>
                    <Button
                        variant={appliedFilters.discontinued === "true" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setLocalFilters(f => ({...f, discontinued: "true", stockStatus: "all"}));
                            setAppliedFilters(f => ({...f, discontinued: "true", stockStatus: "all"}));
                        }}
                    >
                        產品已停售
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label>搜尋</Label>
                        <Input placeholder="名稱、SKU、描述..." value={localFilters.search} onChange={e => setLocalFilters(f => ({...f, search: e.target.value}))} />
                    </div>
                    <div>
                        <Label>分類</Label>
                        <Select value={localFilters.categoryId} onValueChange={v => setLocalFilters(f => ({...f, categoryId: v}))}>
                            <SelectTrigger><SelectValue placeholder="所有分類" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">所有分類</SelectItem>
                                {categoriesData?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>庫存狀態</Label>
                        <Select value={localFilters.stockStatus} onValueChange={v => setLocalFilters(f => ({...f, stockStatus: v}))}>
                            <SelectTrigger><SelectValue placeholder="所有狀態" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">所有狀態</SelectItem>
                                <SelectItem value="inStock">有庫存</SelectItem>
                                <SelectItem value="low">低庫存</SelectItem>
                                <SelectItem value="out-of-stock">缺貨</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>停售狀態</Label>
                        <Select value={localFilters.discontinued} onValueChange={v => setLocalFilters(f => ({...f, discontinued: v}))}>
                            <SelectTrigger><SelectValue placeholder="所有狀態" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">所有狀態</SelectItem>
                                <SelectItem value="false">正常銷售</SelectItem>
                                <SelectItem value="true">已停售</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClearFilters}><X className="mr-2 h-4 w-4" /> 清除篩選</Button>
                <Button onClick={handleApplyFilters}><Search className="mr-2 h-4 w-4" /> 套用篩選</Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>產品列表</CardTitle>
                <CardDescription>您的產品目錄、低庫存和即將到期的警告。</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="whitespace-nowrap">圖片</TableHead>
                            <TableHead className="whitespace-nowrap">名稱</TableHead>
                            <TableHead className="whitespace-nowrap">分類</TableHead>
                            <TableHead className="whitespace-nowrap">SKU</TableHead>
                            <TableHead className="whitespace-nowrap">單位</TableHead>
                            <TableHead className="whitespace-nowrap">價格</TableHead>
                            <TableHead className="whitespace-nowrap">成本</TableHead>
                            <TableHead className="whitespace-nowrap">庫存</TableHead>
                            <TableHead className="whitespace-nowrap">到期日 (主要)</TableHead>
                            <TableHead className="whitespace-nowrap">停售狀態</TableHead>
                            <TableHead className="whitespace-nowrap">警示</TableHead>
                            <TableHead className="text-right whitespace-nowrap">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableSkeleton /> : 
                        products.length === 0 ? (
                            <TableRow><TableCell colSpan={12} className="h-24 text-center">找不到產品。</TableCell></TableRow>
                        ) : (
                            products.map((product: Product) => (
                            <TableRow key={product._id}>
                                <TableCell className="whitespace-nowrap">
                                {product.images?.[0]?.url ? <img src={product.images[0].url} alt={product.name} className="h-10 w-10 object-cover rounded-md" /> : <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center"><ImageOff className="h-5 w-5 text-muted-foreground" /></div>}
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                    <Link to={`/products/${product._id}`} className="hover:underline text-primary">{product.name}</Link>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{product.categoryName}</TableCell>
                                <TableCell className="whitespace-nowrap">{product.sku}</TableCell>
                                <TableCell className="whitespace-nowrap">{product.unit}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatCurrency(product.price)}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatCurrency(product.cost ?? 0)}</TableCell>
                                <TableCell className="whitespace-nowrap">{product.stock}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatToYYYYMMDD(new Date(product.expiryDate))}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {product.discontinued ? (
                                        <Badge variant="secondary" className="bg-gray-500 text-white">已停售</Badge>
                                    ) : (
                                        <Badge variant="default" className="bg-green-600 text-white">正常銷售</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                {product.stock <= product.lowStockThreshold && <Badge variant="destructive">庫存不足 ({product.stock}/{product.lowStockThreshold})</Badge>}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(product); setIsFormOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                                {isAdmin && <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(product); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                </TableCell>
                            </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    總共 {totalProducts} 個產品
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">每頁顯示</p>
                        <Select
                            value={`${pageSize}`}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((size) => (
                                    <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {products.length > 0 && !isLoading && (
                        <PaginationControls
                            currentPage={data.pagination.currentPage}
                            totalPages={data.pagination.totalPages}
                            onPageChange={setPage}
                            hasNextPage={data.pagination.hasNextPage}
                            hasPrevPage={data.pagination.hasPrevPage}
                        />
                    )}
                </div>
            </CardFooter>
        </Card>
      </div>

      <ProductFormDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        product={selectedProduct}
        categories={categoriesData || []}
      />
      
      {selectedProduct && <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>您確定嗎？</AlertDialogTitle>
             <AlertDialogDescription>此操作無法復原。這將永久刪除產品 "{selectedProduct.name}"。</AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>取消</AlertDialogCancel>
             <AlertDialogAction onClick={() => deleteMutation.mutate(selectedProduct._id)} disabled={deleteMutation.isPending}>
               {deleteMutation.isPending ? "刪除中..." : "刪除"}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>}
    </>
  );
}
