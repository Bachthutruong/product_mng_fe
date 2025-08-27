import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOrders, deleteOrder, updateOrderStatus, getCustomer } from "@/services/api";
import { Order } from '@/types';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Loader2, Search, PlusCircle, Edit3, Trash2, Printer, Truck, ThumbsUp, X, CalendarIcon, ArrowLeft, ArrowRight, Eye, Archive } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatToYYYYMMDDWithTime } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = ITEMS_PER_PAGE_OPTIONS[0];

const getChineseStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '待付款',
    'processing': '處理中',
    'shipped': '已出貨', 
    'delivered': '已到貨',
    'completed': '完成',
    'cancelled': '已取消',
    'returned': '已退貨'
  };
  return statusMap[status] || status;
};

const AllOrderStatusOptions: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];

interface OrderStatusActionButtonProps {
  order: Order;
  onStatusUpdated: () => void;
}

function OrderStatusActionButton({ order, onStatusUpdated }: OrderStatusActionButtonProps) {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<Order['status'] | null>(null);

  const openConfirmationDialog = (newStatus: Order['status']) => {
    setTargetStatus(newStatus);
    setIsAlertOpen(true);
  };

  const handleConfirmUpdateStatus = async () => {
    if (!targetStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus({ id: order._id, status: targetStatus });
      toast({
        title: "訂單狀態已更新",
        description: `訂單 ${order.orderNumber} 狀態已變更為 ${getChineseStatus(targetStatus)}.`,
      });
      onStatusUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "更新狀態時發生錯誤",
        description: error.response?.data?.message || "發生預期外的錯誤。",
      });
    } finally {
        setIsUpdatingStatus(false);
        setIsAlertOpen(false);
        setTargetStatus(null);
    }
  };

  let actionButton = null;
  let dialogTitle = "";
  let dialogDescription = "";

  if (order.status === 'pending' || order.status === 'processing') {
    actionButton = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => openConfirmationDialog('shipped')}
        disabled={isUpdatingStatus}
        className="text-xs bg-blue-500 hover:bg-blue-600 text-white"
      >
        {isUpdatingStatus && targetStatus === 'shipped' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Truck className="mr-1 h-3 w-3" />}
        確認已出貨
      </Button>
    );
    dialogTitle = `確認將訂單 ${order.orderNumber} 變更為已出貨?`;
    dialogDescription = "這將會將訂單狀態變更為 '已出貨'。確認嗎？";
  } else if (order.status === 'shipped') {
    actionButton = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => openConfirmationDialog('completed')}
        disabled={isUpdatingStatus}
        className="text-xs bg-teal-500 hover:bg-teal-600 text-white"
      >
        {isUpdatingStatus && targetStatus === 'completed' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ThumbsUp className="mr-1 h-3 w-3" />}
        確認已完成
      </Button>
    );
    dialogTitle = `確認將訂單 ${order.orderNumber} 變更為已完成?`;
    dialogDescription = "這將會將訂單狀態變更為 '已完成'。確認嗎？";
  }

  if (!actionButton) return null;

  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogTrigger asChild>
        {actionButton}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setIsAlertOpen(false); setTargetStatus(null); }} disabled={isUpdatingStatus}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmUpdateStatus}
            disabled={isUpdatingStatus}
            className={
              targetStatus === 'shipped' ? 'bg-blue-500 hover:bg-blue-600' :
                targetStatus === 'completed' ? 'bg-teal-500 hover:bg-teal-600' : ''
            }
          >
            {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
              (targetStatus === 'shipped' ? <Truck className="mr-2 h-4 w-4" /> :
                targetStatus === 'completed' ? <ThumbsUp className="mr-2 h-4 w-4" /> : null
              )
            }
            確認
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface OrderFilters {
  searchTerm: string;
  status: Order['status'] | 'all';
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

export default function OrdersPage() {
  const { loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchTermFromState = location.state?.searchTerm;

  const [searchTermInput, setSearchTermInput] = useState(searchTermFromState || '');
  const [statusInput, setStatusInput] = useState<Order['status'] | 'all'>('all');
  const [dateFromInput, setDateFromInput] = useState<Date | undefined>(undefined);
  const [dateToInput, setDateToInput] = useState<Date | undefined>(undefined);

  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>({
    searchTerm: searchTermFromState || '',
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });
  
  useEffect(() => {
    if (location.state?.searchTerm) {
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // const [totalOrders, setTotalOrders] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_ITEMS_PER_PAGE);

  const fetchOrders = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      const result = await getOrders({
        search: appliedFilters.searchTerm,
        status: appliedFilters.status === 'all' ? '' : appliedFilters.status,
        startDate: appliedFilters.dateFrom ? appliedFilters.dateFrom.toISOString() : undefined,
        endDate: appliedFilters.dateTo ? appliedFilters.dateTo.toISOString() : undefined,
        page: currentPage,
        limit: itemsPerPage,
      });
      setOrders(result.data);
      setTotalPages(result.pagination.totalPages);
      // setTotalOrders(result.pagination.totalItems);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: "無法載入訂單資料。請稍後再試。",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, authLoading, appliedFilters, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
    const handleOrderCreatedOrUpdated = () => {
        fetchOrders();
    };

    const handleOrderDeleted = () => {
        if (orders.length === 1 && currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        } else {
            fetchOrders();
        }
    }

  const handleApplyFilters = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
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

  const handlePrintOrder = async (order: Order) => {
    // Get customer details first
    let customerPhone = '無';
    let customerEmail = '無';
    
    try {
      const customerResponse = await getCustomer(order.customerId);
      if (customerResponse.success && customerResponse.data) {
        customerPhone = customerResponse.data.phone || '無';
        customerEmail = customerResponse.data.email || '無';
      }
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
      // Continue with default values if customer fetch fails
    }
    
    // Calculate subtotal and format numbers
    const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = (order as any).discountAmount || 0;
    const shipping = (order as any).shippingFee || 0;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>訂單資料 - ${order.orderNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body { 
              font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', '微軟正黑體', sans-serif;
              line-height: 1.5;
              padding: 20px;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              margin: 10mm auto;
              background: white;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
            }
            .company-info {
              text-align: left;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .brand-info {
              margin: 15px 0;
            }
            .brand-slogan {
              font-size: 18px;
              font-weight: 600;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .brand-achievements {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }
            .achievement {
              font-size: 12px;
              color: #374151;
              line-height: 1.4;
            }
            .contact {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .order-customer-info {
              text-align: right;
              min-width: 300px;
            }
            .order-customer-info table {
              border-collapse: collapse;
              margin-left: auto;
            }
            .order-customer-info td {
              padding: 8px;
              border: 1px solid #ddd;
              font-size: 14px;
              text-align: left;
            }
            .order-customer-info td:first-child {
              width: 120px;
              background: #f9f9f9;
              font-weight: 500;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table th,
            .items-table td {
              padding: 12px 8px;
              border: 1px solid #ddd;
              text-align: left;
              font-size: 14px;
            }
            .items-table th {
              background: #f9f9f9;
              font-weight: 500;
            }
            .items-table .number {
              text-align: right;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .summary {
              width: 300px;
              margin-left: auto;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
              font-size: 14px;
            }
            .summary-row.total {
              font-weight: 700;
              font-size: 16px;
              border-top: 2px solid #000;
              border-bottom: none;
              margin-top: 8px;
              padding-top: 12px;
            }
            .summary-row .number {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .notes {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .notes h3 {
              font-size: 16px;
              font-weight: 500;
            }
            .notes p {
              font-size: 14px;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
            @media print {
              .page {
                margin: 0;
                box-shadow: none;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="company-info">
                <div class="title">Annie's Way 安妮絲薇</div>
                <div class="brand-info">
                  <div class="brand-slogan">果凍面膜第一品牌</div>
                  <div class="brand-achievements">
                    <div class="achievement">💎單月熱銷突破 10 萬瓶</div>
                    <div class="achievement">💎榮獲多項國內外大獎</div>
                    <div class="achievement">💎獲頒高雄十大化妝品伴手禮</div>
                    <div class="achievement">💎全球知名媒體報導推薦</div>
                    <div class="achievement">💎榮獲台灣精品獎、FG特優評鑑</div>
                    <div class="achievement">💎入圍屈臣氏、柯夢波丹美妝大賞</div>
                    <div class="achievement">💎通過國際GMP、ISO高規格品管認證</div>
                  </div>
                </div>
                <div class="contact">客服信箱：sales@anniesway.com.tw</div>
              </div>
              <div class="order-customer-info">
                <table>
                  <tr>
                    <td>訂單編號</td>
                    <td>${order.orderNumber}</td>
                  </tr>
                  <tr>
                    <td>訂單日期</td>
                    <td>${formatToYYYYMMDDWithTime(new Date(order.orderDate))}</td>
                  </tr>
                  <tr>
                    <td>客戶名稱</td>
                    <td>${order.customerName}</td>
                  </tr>
                  <tr>
                    <td>客戶電話</td>
                    <td>${customerPhone}</td>
                  </tr>
                  <tr>
                    <td>客戶信箱</td>
                    <td>${customerEmail}</td>
                  </tr>
                </table>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50px">#</th>
                  <th>商品名稱</th>
                  <th style="width: 80px">數量</th>
                  <th style="width: 120px" class="number">單價</th>
                  <th style="width: 120px" class="number">小計</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td class="number">${formatCurrency(item.unitPrice)}</td>
                    <td class="number">${formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                <span>小計：</span>
                <span class="number">${formatCurrency(subtotal)}</span>
              </div>
              ${discount > 0 ? `
                <div class="summary-row">
                  <span>折扣：</span>
                  <span class="number">-${formatCurrency(discount)}</span>
                </div>
              ` : ''}
              ${shipping > 0 ? `
                <div class="summary-row">
                  <span>運費：</span>
                  <span class="number">${formatCurrency(shipping)}</span>
                </div>
              ` : ''}
              <div class="summary-row total">
                <span>總計：</span>
                <span class="number">${formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            ${order.notes ? `
              <div class="notes">
                <h3>備註</h3>
                <p>${order.notes}</p>
              </div>
            ` : ''}

          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; margin: 0 10px; font-size: 14px; cursor: pointer;">
              列印訂單
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; margin: 0 10px; font-size: 14px; cursor: pointer;">
              關閉
            </button>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'height=700,width=900');
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "列印錯誤",
        description: "無法開啟列印視窗。請檢查您的彈出視窗阻擋設定。",
      });
      return;
    }

    // Wait for content to load before focusing
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Use onload to ensure content is fully loaded
    printWindow.onload = function() {
      printWindow.focus();
    };
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold">訂單管理</h1>
          <div className="space-x-2">
            {/* <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> 批量導入訂單</Button> */}
            <Button variant="outline" onClick={() => navigate('/admin/deleted-orders')}><Archive className="mr-2 h-4 w-4" /> 查看已刪除的訂單</Button>
            <Button onClick={() => navigate('/orders/create')}>
              <PlusCircle className="mr-2 h-4 w-4" /> 新增訂單
            </Button>
          </div>
      <Card>
          <CardHeader>
            <CardTitle>查詢訂單</CardTitle>
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
                      {dateFromInput ? format(dateFromInput, "PPP") : <span>選擇起始日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFromInput} onSelect={setDateFromInput} initialFocus /></PopoverContent>
                </Popover>
                 <Popover>
                  <PopoverTrigger asChild>
                     <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateToInput && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateToInput ? format(dateToInput, "PPP") : <span>選擇結束日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateToInput} onSelect={setDateToInput} disabled={(date) => dateFromInput ? date < dateFromInput : false} initialFocus /></PopoverContent>
                </Popover>
            </div>
            <div className="flex justify-start space-x-2">
              <Button onClick={() => handleApplyFilters()}><Search className="mr-2 h-4 w-4" /> 套用</Button>
              <Button variant="ghost" onClick={handleClearFilters}><X className="mr-2 h-4 w-4" /> 清除過濾</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
        <CardHeader>
            <CardTitle>訂單列表</CardTitle>
            <CardDescription>管理及追蹤所有客戶訂單。</CardDescription>
        </CardHeader>
        <CardContent>
        {isLoading ? <p>Loading...</p> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>訂單編號</TableHead><TableHead>客戶</TableHead><TableHead>日期</TableHead>
                    <TableHead>建立者</TableHead><TableHead>總計</TableHead><TableHead>狀態</TableHead>
                    <TableHead>利潤</TableHead><TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <span
                        className="font-medium text-primary cursor-pointer hover:underline"
                        onClick={() => navigate(`/orders/${order._id}`)}
                      >
                        {order.orderNumber}
                      </span>
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
                    <TableCell>{(order as any).createdByName || '無'}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge
                          variant={
                            order.status === 'completed' ? 'default' :
                              order.status === 'delivered' ? 'default' :
                                order.status === 'shipped' ? 'default' :
                                  order.status === 'cancelled' ? 'destructive' :
                                    order.status === 'returned' ? 'destructive' :
                                      'secondary'
                          }
                          className={
                            order.status === 'completed' ? 'bg-green-600 text-white' :
                              order.status === 'delivered' ? 'bg-emerald-500 text-white' :
                                order.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                                  order.status === 'processing' ? 'bg-blue-400 text-blue-900' :
                                    order.status === 'shipped' ? 'bg-purple-500 text-white' :
                                      order.status === 'cancelled' ? 'bg-red-500 text-white' :
                                        order.status === 'returned' ? 'bg-gray-500 text-white' : ''
                          }
                        >
                          {getChineseStatus(order.status)}
                        </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency((order as any).profit || 0)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/orders/${order._id}`)}><Eye className="h-4 w-4" /></Button>
                        <OrderStatusActionButton order={order} onStatusUpdated={handleOrderCreatedOrUpdated} />
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/orders/${order._id}/edit`)}><Edit3 className="h-4 w-4" /></Button>
                        <DeleteOrderButton orderId={order._id} orderNumber={order.orderNumber} onOrderDeleted={handleOrderDeleted} />
                        <Button variant="ghost" size="icon" onClick={() => handlePrintOrder(order).catch(console.error)}><Printer className="h-4 w-4" /></Button>
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

function DeleteOrderButton({ orderId, orderNumber, onOrderDeleted }: { orderId: string, orderNumber: string, onOrderDeleted: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteOrder(orderId);
      toast({ title: "訂單已刪除" });
      onOrderDeleted();
    } catch (error) {
       toast({ variant: "destructive", title: "刪除失敗" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>確認刪除?</AlertDialogTitle><AlertDialogDescription>確定要刪除訂單 {orderNumber}?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>刪除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
