import { useState } from "react";
import { useQuery, keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventoryMovements, getProducts, revertInventoryMovement } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatToYYYYMMDDWithTime, formatToYYYYMMDD } from "@/lib/date-utils";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryMovement } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { Undo2 } from "lucide-react";
import { SearchableSelect } from "../ui/SearchableSelect";

const ITEMS_PER_PAGE = 15;

const getMovementBadgeVariant = (type: string) => {
    if (type.includes('add') || type.includes('in')) return 'default';
    if (type.includes('remove') || type.includes('out')) return 'destructive';
    return 'secondary';
};

const translateMovementType = (type: string) => {
  switch (type) {
    case 'stock-in':
      return '入庫';
    case 'adjustment-add':
      return '調整 (增加)';
    case 'adjustment-remove':
      return '調整 (減少)';
    case 'stock-out':
    case 'sale':
      return '出庫 (銷售)';
    default:
      return type;
  }
};

const TableSkeleton = () => (
    Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <TableRow key={index}>
            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
            <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        </TableRow>
    ))
);

export function MovementHistory() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ 
        productId: '', 
        type: '', 
        search: '',
        dateRange: { from: undefined, to: undefined } as DateRange | undefined,
    });
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: movementsResult, isLoading } = useQuery({
        queryKey: ['inventoryMovements', page, filters],
        queryFn: () => getInventoryMovements({ 
            page, 
            limit: ITEMS_PER_PAGE, 
            productId: filters.productId,
            type: filters.type,
            search: filters.search,
            startDate: filters.dateRange?.from?.toISOString(),
            endDate: filters.dateRange?.to?.toISOString(),
        }),
        placeholderData: keepPreviousData,
    });

    const { data: productsData } = useQuery({
        queryKey: ['products', 'all'],
        queryFn: () => getProducts({ limit: 1000, discontinued: 'false' })
    });

    const revertMutation = useMutation({
        mutationFn: revertInventoryMovement,
        onSuccess: () => {
            toast({ title: "成功", description: "庫存移動已成功撤銷。" });
            queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "錯誤",
                description: error.response?.data?.error || "無法撤銷庫存移動。",
            });
        },
    });

    const movements = movementsResult?.data || [];
    const allProducts = productsData?.data || [];
    const pagination = movementsResult?.pagination;

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    
    const clearFilters = () => {
        setFilters({
            productId: '',
            type: '',
            search: '',
            dateRange: { from: undefined, to: undefined },
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>庫存歷史</CardTitle>
                <CardDescription>追蹤所有庫存移動記錄。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Input 
                        placeholder="搜尋產品、用戶、備註..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                    <SearchableSelect
                        placeholder="依產品篩選..."
                        searchPlaceholder="搜尋產品..."
                        emptyMessage="找不到產品"
                        items={allProducts.map((p: any) => ({ value: p._id, label: p.name }))}
                        value={filters.productId}
                        onChange={(v) => handleFilterChange('productId', v)}
                    />
                     <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                        <SelectTrigger><SelectValue placeholder="依類型篩選..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="stock-in">入庫</SelectItem>
                            <SelectItem value="adjustment-add">調整 (增加)</SelectItem>
                            <SelectItem value="adjustment-remove">調整 (減少)</SelectItem>
                             <SelectItem value="stock-out">出庫 (銷售)</SelectItem>
                        </SelectContent>
                    </Select>
                    <DatePickerWithRange
                        date={filters.dateRange}
                        onDateChange={(date) => handleFilterChange('dateRange', date)}
                    />
                </div>
                 <div className="flex justify-end gap-2 mb-4">
                    <Button variant="outline" onClick={clearFilters}>清除篩選</Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>日期</TableHead>
                            <TableHead>產品</TableHead>
                            <TableHead>類型</TableHead>
                            <TableHead>數量</TableHead>
                            <TableHead>變動前庫存</TableHead>
                            <TableHead>變動後庫存</TableHead>
                            <TableHead>批次效期</TableHead>
                            <TableHead>操作用戶</TableHead>
                            <TableHead>備註</TableHead>
                            <TableHead>操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableSkeleton /> :
                            movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        找不到庫存移動記錄。
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((m: InventoryMovement) => (
                                    <TableRow key={m._id}>
                                        <TableCell>{formatToYYYYMMDDWithTime(new Date(m.movementDate))}</TableCell>
                                        <TableCell className="font-medium">{m.productName}</TableCell>
                                        <TableCell><Badge variant={getMovementBadgeVariant(m.type)}>{translateMovementType(m.type)}</Badge></TableCell>
                                        <TableCell className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>{m.quantity}</TableCell>
                                        <TableCell>{m.stockBefore}</TableCell>
                                        <TableCell>{m.stockAfter}</TableCell>
                                        <TableCell>{m.batchExpiryDate ? formatToYYYYMMDD(new Date(m.batchExpiryDate)) : 'N/A'}</TableCell>
                                        <TableCell>{m.userName || 'N/A'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={m.notes}>{m.notes}</TableCell>
                                        <TableCell>
                                            {m.isReverted ? (
                                                <span className="text-sm text-muted-foreground">已撤銷</span>
                                            ) : m.isRevertible ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => revertMutation.mutate(m._id)}
                                                    disabled={revertMutation.isPending}
                                                >
                                                    <Undo2 className="h-4 w-4 mr-1" />
                                                    撤銷
                                                </Button>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">不可撤銷</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                    </TableBody>
                </Table>
                {!isLoading && movements.length > 0 && (
                    <PaginationControls
                        currentPage={pagination?.currentPage || 1}
                        totalPages={pagination?.totalPages || 1}
                        onPageChange={setPage}
                        hasNextPage={pagination?.hasNextPage}
                        hasPrevPage={pagination?.hasPrevPage}
                    />
                )}
            </CardContent>
        </Card>
    );
} 