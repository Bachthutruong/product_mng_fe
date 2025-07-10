import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getOrders, getCustomer } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { Order } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerOrdersPage() {
    const { customerId } = useParams<{ customerId: string }>();
    const [searchParams, setSearchParams] = useSearchParams({
        page: "1",
        limit: "10",
    });

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const { data: customerResponse, isLoading: isCustomerLoading } = useQuery({
        queryKey: ["customer", customerId],
        queryFn: () => getCustomer(customerId!),
        enabled: !!customerId,
    });

    const { data: ordersData, isLoading: areOrdersLoading, isPlaceholderData } = useQuery({
        queryKey: ["orders", { customerId, page, limit }],
        queryFn: () => getOrders({ customerId: customerId!, page, limit }),
        enabled: !!customerId,
        placeholderData: (previousData) => previousData,
    });
    
    const customer = customerResponse?.data;
    const orders = ordersData?.data ?? [];
    const pagination = ordersData?.pagination;

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

    const TableSkeleton = () => (
        Array.from({ length: limit }).map((_, index) => (
          <TableRow key={index}>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
            <TableCell><Skeleton className="h-8 w-[80px]" /></TableCell>
          </TableRow>
        ))
    );

    return (
        <div className="space-y-4">
             <Button variant="outline" asChild>
                <Link to="/customers">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回客戶列表
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>
                        {isCustomerLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `訂單列表 - ${customer?.name}`}
                    </CardTitle>
                    <CardDescription>
                        {customer?.email} | {customer?.phone}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>訂單號</TableHead>
                                <TableHead>狀態</TableHead>
                                <TableHead>總金額</TableHead>
                                <TableHead>訂單日期</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areOrdersLoading && isPlaceholderData ? (
                                <TableSkeleton />
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        沒有找到任何訂單。
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order: Order) => (
                                    <TableRow key={order._id}>
                                        <TableCell className="font-mono">
                                            <Link to={`/orders/${order._id}`} className="hover:underline">
                                                {order.orderNumber}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>{order.status}</Badge>
                                        </TableCell>
                                        <TableCell>NT${order.totalAmount.toLocaleString()}</TableCell>
                                        <TableCell>{formatToYYYYMMDDWithTime(new Date(order.createdAt))}</TableCell>
                                        {/* <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link to={`/orders/${order._id}`}>查看詳情</Link>
                                            </Button>
                                        </TableCell> */}
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
                            <Select value={String(limit)} onValueChange={handleLimitChange} disabled={areOrdersLoading}>
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
                          hasNextPage={pagination.hasNextPage}
                          hasPrevPage={pagination.hasPrevPage}
                        />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
} 