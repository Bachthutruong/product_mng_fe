import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { ArrowLeft, User, List, Info, DollarSign } from "lucide-react";

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending': return 'secondary';
    case 'processing': return 'default';
    case 'shipped': return 'outline';
    case 'delivered': case 'returned': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
};

const PageSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
    </div>
);

const InfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center text-sm py-2 border-b">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-right">{value}</span>
    </div>
);

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: orderData, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });

  const order = orderData?.data;

  if (isLoading) return <PageSkeleton />;
  if (isError) return <div className="text-red-500 text-center py-10">Error fetching order: {error?.message || 'Unknown error'}</div>;
  if (!order) return <div className="text-center py-10">Order not found.</div>;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link to="/orders">
                    <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">訂單編號 {order.orderNumber}</h1>
                    <p className="text-muted-foreground">訂單詳細資料</p>
                </div>
            </div>
            <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize text-base px-4 py-2">{order.status}</Badge>
        </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Info /> 訂單資訊</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="訂單編號" value={order.orderNumber} />
            <InfoRow label="訂單日期" value={formatToYYYYMMDDWithTime(new Date(order.orderDate))} />
            <InfoRow label="狀態" value={<Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">{order.status}</Badge>} />
            <InfoRow label="建立者" value={order.createdByName || 'N/A'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User /> 客戶資訊</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="客戶名稱" value={order.customerName} />
            <InfoRow label="客戶ID" value={order.customerId} />
          </CardContent>
        </Card>
      </div>

      {order.notes && <Card><CardHeader><CardTitle>備註</CardTitle></CardHeader><CardContent><p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p></CardContent></Card>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><List /> 訂單商品</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead className="text-right">單價</TableHead>
                <TableHead className="text-right">總價</TableHead>
                <TableHead>備註</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.productSku || 'N/A'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency((item.unitPrice ?? 0) * item.quantity)}</TableCell>
                  <TableCell>{item.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign /> 訂單摘要</CardTitle></CardHeader>
        <CardContent className="w-full md:w-1/2 ml-auto space-y-2 text-sm">
            <InfoRow label="小計" value={formatCurrency(order.subtotal ?? 0)} />
            <InfoRow label="運費" value={formatCurrency(order.shippingFee ?? 0)} />
            <InfoRow label="折扣" value={`- ${formatCurrency(order.discountAmount ?? 0)}`} />
            <InfoRow label="總金額" value={<span className="font-bold text-lg">{formatCurrency(order.totalAmount ?? 0)}</span>} />
            <InfoRow label="利潤" value={<span className="font-bold text-lg text-green-600">{formatCurrency(order.profit ?? 0)}</span>} />
        </CardContent>
      </Card>
      
      <div className="text-center">
        <Link to="/orders"><Button variant="outline">返回訂單列表</Button></Link>
      </div>
    </div>
  );
} 