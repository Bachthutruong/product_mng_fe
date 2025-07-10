import { useParams, Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProduct, uploadProductImages, deleteProductImage, setPrimaryProductImage } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { formatToYYYYMMDD, formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { ArrowLeft, Info, DollarSign, Package, Calendar, Layers, ClipboardList, Package2, X, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";

const InfoRow = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={`flex justify-between items-center text-sm py-1 ${className}`}>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-right">{value}</span>
    </div>
);

const PageSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-[360px] w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    </div>
);

export default function ProductDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const [historySearch, setHistorySearch] = useState('');
    const [batchSearch, setBatchSearch] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    const { data: productData, isLoading, isError, error } = useQuery({
        queryKey: ['product', id],
        queryFn: () => getProduct(id!),
        enabled: !!id,
    });

    const product = productData?.data;

    useEffect(() => {
        if (product?.images && product.images.length > 0) {
            const primaryImage = product.images.find((img: any) => img.isPrimary);
            setSelectedImage(primaryImage ? primaryImage.url : product.images[0].url);
        }
    }, [product]);

    const uploadImagesMutation = useMutation({
        mutationFn: ({ productId, files }: { productId: string; files: File[] }) => {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });
            return uploadProductImages({ id: productId, formData });
        },
        onSuccess: () => {
            toast({ title: "成功", description: "圖片已成功上傳。" });
            queryClient.invalidateQueries({ queryKey: ['product', id] });
            setFilesToUpload([]);
        },
        onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "上傳圖片失敗。" }),
    });

    const deleteImageMutation = useMutation({
        mutationFn: deleteProductImage,
        onSuccess: () => {
            toast({ title: "成功", description: "圖片已成功刪除。" });
            queryClient.invalidateQueries({ queryKey: ['product', id] });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "刪除圖片失敗。" }),
    });

    const setPrimaryImageMutation = useMutation({
        mutationFn: setPrimaryProductImage,
        onSuccess: () => {
            toast({ title: "成功", description: "主要圖片已更新。" });
            queryClient.invalidateQueries({ queryKey: ['product', id] });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "錯誤", description: err.response?.data?.error || "操作失敗。" }),
    });
    
    const filteredHistory = React.useMemo(() => 
        product?.inventoryMovements?.filter((move: any) =>
          (move.userName?.toLowerCase().includes(historySearch.toLowerCase())) ||
          (move.notes?.toLowerCase().includes(historySearch.toLowerCase()))
        ) || [], [product?.inventoryMovements, historySearch]);

    const filteredBatches = React.useMemo(() =>
        product?.batches?.filter((batch: any) =>
          batch.batchId?.toLowerCase().includes(batchSearch.toLowerCase()) ||
          batch.notes?.toLowerCase().includes(batchSearch.toLowerCase())
        ) || [], [product?.batches, batchSearch]);

    if (isLoading) return <PageSkeleton />;
    if (isError) return <div className="text-red-500 text-center py-10">Error fetching product: {error?.message || 'Unknown error'}</div>;
    if (!product) return <div className="text-center py-10">Product not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/products"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div>
                    <h1 className="text-2xl font-bold">{product.name}</h1>
                    <p className="text-muted-foreground">產品詳細資料</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Package /> 產品圖片</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-center p-4 bg-muted rounded-lg min-h-[300px]">
                                {selectedImage ? 
                                    <img src={selectedImage} alt={product.name} className="max-h-[400px] max-w-full object-contain rounded-md" /> :
                                    <div className="text-muted-foreground flex flex-col items-center gap-2"><Package2 size={48} /><p>無圖片</p></div>
                                }
                            </div>
                            {product.images?.length > 0 && (
                                <div className="grid grid-cols-5 gap-2">
                                    {product.images.map((image: any) => (
                                        <div key={image.publicId} className="relative group aspect-square">
                                            <img 
                                                src={image.url} 
                                                alt="thumbnail" 
                                                className={`object-cover w-full h-full rounded-md cursor-pointer border-2 ${selectedImage === image.url ? 'border-primary' : 'border-transparent'}`}
                                                onClick={() => setSelectedImage(image.url)}
                                            />
                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="outline" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white" onClick={() => setPrimaryImageMutation.mutate({ productId: product._id, imageId: encodeURIComponent(image.publicId) })}>
                                                    <Star className={`h-4 w-4 ${image.isPrimary ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                                                </Button>
                                                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => deleteImageMutation.mutate({ productId: product._id, imageId: encodeURIComponent(image.publicId) })}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>新增圖片</CardTitle></CardHeader>
                        <CardContent>
                            <ImageUploader onFilesChange={setFilesToUpload} />
                            {filesToUpload.length > 0 && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        onClick={() => uploadImagesMutation.mutate({ productId: product._id, files: filesToUpload })}
                                        disabled={uploadImagesMutation.isPending}
                                    >
                                        {uploadImagesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        上傳 {filesToUpload.length} 張圖片
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>產品描述</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">{product.description || '無描述'}</p></CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Info /> 基本資訊</CardTitle></CardHeader>
                        <CardContent>
                            <InfoRow label="SKU" value={product.sku} />
                            <InfoRow label="分類" value={product.categoryName} />
                            <InfoRow label="單位" value={product.unit} />
                            <InfoRow label="庫存" value={<Badge variant={product.stock <= product.lowStockThreshold ? "destructive" : "default"}>{product.stock}</Badge>} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign /> 定價</CardTitle></CardHeader>
                        <CardContent>
                            <InfoRow label="銷售價格" value={formatCurrency(product.price)} />
                            <InfoRow label="成本價格" value={formatCurrency(product.cost)} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar /> 到期 & 警示</CardTitle></CardHeader>
                        <CardContent>
                            <InfoRow label="到期日期" value={formatToYYYYMMDD(new Date(product.expiryDate))} />
                            <InfoRow label="低庫存門檻" value={product.lowStockThreshold} />
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList /> 庫存歷史</CardTitle>
                <CardDescription>該商品歷史的所有庫存移動記錄，包括數量和批次到期日期。</CardDescription>
              </CardHeader>
              <CardContent>
                <Input placeholder="搜尋用戶、備註..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                {filteredHistory.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>類型</TableHead><TableHead>數量</TableHead><TableHead>用戶</TableHead><TableHead>日期</TableHead><TableHead>備註</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredHistory.map((move: any) => (
                                <TableRow key={move._id}>
                                    <TableCell><Badge variant={move.type === 'stock-in' ? 'default' : 'secondary'}>{move.type}</Badge></TableCell>
                                    <TableCell className={move.quantity > 0 ? 'text-green-600' : 'text-red-600'}>{move.quantity}</TableCell>
                                    <TableCell>{move.userName || 'N/A'}</TableCell>
                                    <TableCell>{formatToYYYYMMDDWithTime(new Date(move.createdAt))}</TableCell>
                                    <TableCell>{move.notes || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-muted-foreground">此產品暫無庫存移動記錄。</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Layers /> 批次資訊</CardTitle><CardDescription>目前批次的詳細資訊，包括到期日期和剩餘數量。 找到 {product.batches?.length || 0} 筆批次記錄。</CardDescription></CardHeader>
              <CardContent>
                <Input placeholder="搜尋批次 ID、備註..." value={batchSearch} onChange={e => setBatchSearch(e.target.value)} />
                 {filteredBatches.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>批次 ID</TableHead><TableHead>到期日期</TableHead><TableHead>初始數量</TableHead><TableHead>剩餘數量</TableHead><TableHead>狀態</TableHead><TableHead>單位成本</TableHead><TableHead>備註</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredBatches.map((batch: any) => (
                                <TableRow key={batch.batchId}>
                                    <TableCell>{batch.batchId}</TableCell>
                                    <TableCell>{formatToYYYYMMDD(new Date(batch.expiryDate))}</TableCell>
                                    <TableCell>{batch.initialQuantity}</TableCell>
                                    <TableCell>{batch.remainingQuantity}</TableCell>
                                    <TableCell><Badge>正常</Badge></TableCell>
                                    <TableCell>{formatCurrency(batch.costPerUnit ?? 0)}</TableCell>
                                    <TableCell>{batch.notes || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 ) : <p className="text-muted-foreground">此產品暫無批次記錄。</p>}
              </CardContent>
            </Card>

            <div className="text-center">
                <Link to="/products"><Button variant="outline">返回產品列表</Button></Link>
            </div>
        </div>
    );
} 