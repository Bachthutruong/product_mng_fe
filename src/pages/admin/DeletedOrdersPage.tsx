"use client";

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDeletedOrders, restoreOrder } from '@/services/api';
import type { Order } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Search, ShieldAlert, PackageSearch, X, CalendarIcon, ArrowLeft, ArrowRight, Undo } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatToYYYYMMDDWithTime } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = ITEMS_PER_PAGE_OPTIONS[0];

const getChineseStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '待付款',
    'processing': '處理中',
    'shipped': '已出貨',
    'delivered': '已送達',
    'completed': '已完成',
    'cancelled': '已取消',
    'returned': '已退貨'
  };
  return statusMap[status] || status;
};

const AllOrderStatusOptions: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];

interface OrderFilters {
  searchTerm: string;
  status: Order['status'] | 'all';
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

function OrderDetailsDialog({ order }: { order: Order }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-primary cursor-pointer hover:underline"
        >
          {order.orderNumber}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>訂單詳細資料 - {order.orderNumber}</DialogTitle>
          <DialogDescription>
            此為已刪除訂單的詳細資料。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground">客戶</label>
                    <p>{order.customerName}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">訂單日期</label>
                    <p>{formatToYYYYMMDDWithTime(new Date(order.orderDate))}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">狀態</label>
                    <p><Badge variant="destructive">{getChineseStatus(order.status)}</Badge></p>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">總金額</label>
                    <p>{formatCurrency(order.totalAmount)}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">刪除於</label>
                    <p>{order.deletedAt ? formatToYYYYMMDDWithTime(new Date(order.deletedAt)) : 'N/A'}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">刪除者</label>
                    <p>{order.deletedByName || 'N/A'}</p>
                </div>
            </div>
          <h4 className="font-semibold pt-4">訂單品項</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead className="text-right">單價</TableHead>
                <TableHead className="text-right">小計</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items && order.items.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreOrderButton({ orderId, onOrderRestored }: { orderId: string, onOrderRestored: () => void }) {
    const [isRestoring, setIsRestoring] = useState(false);
    const { toast } = useToast();

    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            await restoreOrder(orderId);
            toast({
                title: "訂單已還原",
                description: "訂單已成功還原並移回訂單列表。",
            });
            onOrderRestored();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "還原失敗",
                description: "還原訂單時發生錯誤。",
            });
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring}
        >
            {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo className="mr-2 h-4 w-4" />}
            還原
        </Button>
    );
}

export default function DeletedOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTermInput, setSearchTermInput] = useState('');
  const [statusInput, setStatusInput] = useState<Order['status'] | 'all'>('all');
  const [dateFromInput, setDateFromInput] = useState<Date | undefined>(undefined);
  const [dateToInput, setDateToInput] = useState<Date | undefined>(undefined);

  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>({
    searchTerm: '',
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_ITEMS_PER_PAGE);

  const fetchDeletedOrders = useCallback(async () => {
    if (authLoading || !user || user.role !== 'admin') {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
      const result = await getDeletedOrders({
        search: appliedFilters.searchTerm,
        status: appliedFilters.status === 'all' ? '' : appliedFilters.status,
        startDate: appliedFilters.dateFrom ? appliedFilters.dateFrom.toISOString() : undefined,
        endDate: appliedFilters.dateTo ? appliedFilters.dateTo.toISOString() : undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      if (result.data && result.pagination) {
          setOrders(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotalOrders(result.pagination.totalItems);
      } else {
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
      }
    } catch (error) {
      console.error("Failed to fetch deleted orders:", error);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: "無法載入已刪除訂單。請稍後再試。",
      });
      setOrders([]);
      setTotalPages(1);
      setTotalOrders(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, appliedFilters, currentPage, itemsPerPage, toast]);

  useEffect(() => {
    fetchDeletedOrders();
  }, [fetchDeletedOrders]);
  
  const handleOrderRestored = () => {
      if (orders.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
      } else {
          fetchDeletedOrders();
      }
  }

  const handleApplyFilters = () => {
    setAppliedFilters({
      searchTerm: searchTermInput,
      status: statusInput,
      dateFrom: dateFromInput,
      dateTo: dateToInput,
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTermInput('');
    setStatusInput('all');
    setDateFromInput(undefined);
    setDateToInput(undefined);
    setAppliedFilters({
      searchTerm: '',
      status: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (newSize: string) => {
    setItemsPerPage(parseInt(newSize, 10));
    setCurrentPage(1);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-6">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">已刪除訂單</h1>
        <Button onClick={() => navigate('/orders')}><ArrowLeft className="mr-2 h-4 w-4" /> 返回訂單列表</Button>
       </div>

        <Card>
            <CardHeader>
                <CardTitle>過濾已刪除訂單</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <Input
                placeholder="訂單編號, 客戶姓名..."
                value={searchTermInput}
                onChange={(e) => setSearchTermInput(e.target.value)}
              />
               <Select value={statusInput} onValueChange={(value) => setStatusInput(value as Order['status'] | 'all')}>
                  <SelectTrigger><SelectValue placeholder="所有狀態" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有狀態</SelectItem>
                    {AllOrderStatusOptions.map(statusValue => (
                      <SelectItem key={statusValue} value={statusValue}>
                        {getChineseStatus(statusValue)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateFromInput && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFromInput ? format(dateFromInput, "PPP") : <span>選擇起始刪除日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFromInput} onSelect={setDateFromInput} initialFocus /></PopoverContent>
                </Popover>
                 <Popover>
                  <PopoverTrigger asChild>
                     <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateToInput && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateToInput ? format(dateToInput, "PPP") : <span>選擇結束刪除日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateToInput} onSelect={setDateToInput} disabled={(date) => dateFromInput ? date < dateFromInput : false} initialFocus /></PopoverContent>
                </Popover>
            </div>
            <div className="flex justify-start space-x-2">
              <Button onClick={handleApplyFilters}><Search className="mr-2 h-4 w-4" /> 套用</Button>
              <Button variant="ghost" onClick={handleClearFilters}><X className="mr-2 h-4 w-4" /> 清除</Button>
            </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>已刪除訂單列表</CardTitle>
                <CardDescription>
                    共找到 {totalOrders} 筆已刪除的訂單。
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10">
                        <PackageSearch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">找不到已刪除的訂單</h3>
                        <p className="text-muted-foreground">沒有符合搜尋條件的已刪除訂單。</p>
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>訂單編號</TableHead>
                                    <TableHead>客戶</TableHead>
                                    <TableHead>訂單日期</TableHead>
                                    <TableHead>刪除日期</TableHead>
                                    <TableHead>刪除者</TableHead>
                                    <TableHead>總金額</TableHead>
                                    <TableHead>狀態</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map(order => (
                                    <TableRow key={order._id}>
                                        <TableCell>
                                            <OrderDetailsDialog order={order} />
                                        </TableCell>
                                        <TableCell>
                                            <span 
                                                className="font-medium text-primary cursor-pointer hover:underline"
                                                onClick={() => navigate(`/customers/${order.customerId}/orders`)}
                                            >
                                                {order.customerName}
                                            </span>
                                        </TableCell>
                                        <TableCell>{formatToYYYYMMDDWithTime(new Date(order.orderDate))}</TableCell>
                                        <TableCell>{order.deletedAt ? formatToYYYYMMDDWithTime(new Date(order.deletedAt)) : 'N/A'}</TableCell>
                                        <TableCell>{order.deletedByName || 'N/A'}</TableCell>
                                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">{getChineseStatus(order.status)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <RestoreOrderButton orderId={order._id} onOrderRestored={handleOrderRestored} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">每頁顯示:</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={handleItemsPerPageChange}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={itemsPerPage} />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {ITEMS_PER_PAGE_OPTIONS.map(size => (
                                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </div>
                                <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">
                                    第 {currentPage} 頁，共 {totalPages} 頁
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1 || isLoading}
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" /> 上一頁
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages || isLoading}
                                >
                                    下一頁 <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                                </div>
                          </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
} 