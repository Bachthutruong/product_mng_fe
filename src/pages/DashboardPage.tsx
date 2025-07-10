import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getRecentActivity, getInventoryAlerts } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Package, Users, ShoppingCart, BarChart3, AlertTriangle, Clock, List, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

function StatCard({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: statsData, isLoading: isLoadingStats } = useQuery({ queryKey: ['dashboardStats'], queryFn: getDashboardStats });
  const { data: activityData, isLoading: isLoadingActivity } = useQuery({ queryKey: ['recentActivity'], queryFn: getRecentActivity });
  const { data: alertsData, isLoading: isLoadingAlerts } = useQuery({ queryKey: ['inventoryAlerts'], queryFn: getInventoryAlerts });

  const stats = statsData?.data;
  const activities = activityData?.data;
  const alerts = alertsData?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">總覽概況</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="總商品數量" value={stats?.totalProducts || 0} icon={Package} loading={isLoadingStats} />
        <StatCard title="活躍訂單" value={stats?.activeOrders || 0} icon={ShoppingCart} loading={isLoadingStats} />
        <StatCard title="總客戶數量" value={stats?.totalCustomers || 0} icon={Users} loading={isLoadingStats} />
        <StatCard title="本月收入" value={formatCurrency(stats?.currentMonthRevenue || 0, 'NT$')} icon={BarChart3} loading={isLoadingStats} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock /> 最近活動</CardTitle>
            <CardDescription>最近庫存變動和訂單的狀況</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-2 flex items-center gap-2"><List /> 最新訂單</h3>
              {isLoadingActivity ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                activities?.recentOrders?.length > 0 ? (
                  <ul className="space-y-2">
                    {activities.recentOrders.map((order: any) => (
                      <li key={order._id} className="text-sm flex justify-between">
                        <span>
                          訂單 <Link to={`/orders/${order._id}`} className="hover:underline"><Badge variant="secondary">{order.orderNumber}</Badge></Link>: {order.customerName} ({formatCurrency(order.totalAmount, 'NT$')})
                        </span>
                        <span className="text-muted-foreground">{formatToYYYYMMDDWithTime(new Date(order.orderDate))}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">沒有最近的訂單。</p>
              }
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-base mb-2 flex items-center gap-2"><ArrowRightLeft /> 庫存變動狀況</h3>
              {isLoadingActivity ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                activities?.recentInventoryMovements?.length > 0 ? (
                  <ul className="space-y-2">
                    {activities.recentInventoryMovements.map((move: any) => (
                      <li key={move._id} className="text-sm flex justify-between">
                        <span>{move.type === 'stock-in' ? 'Stock In' : 'Sale'}: {move.productName} (數量: {move.quantity})</span>
                        <span className="text-muted-foreground">{formatToYYYYMMDDWithTime(new Date(move.createdAt))}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">沒有最近的庫存變動。</p>
              }
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> 商品警告</CardTitle>
            <CardDescription>需要關注的商品庫存數量或到期日期</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAlerts ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <div>
                  <h3 className="font-semibold text-destructive">庫存數量低於安全值警告</h3>
                  {alerts?.lowStock?.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                      {alerts.lowStock.map((p: any) => <li key={p._id}>{p.name} 庫存不足 ({p.stock} 單位 / 門檻: {p.lowStockThreshold})</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground mt-1">沒有低庫存商品。</p>}
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-destructive">1年內到期</h3>
                  {alerts?.nearlyExpired?.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                      {alerts.nearlyExpired.map((p: any) => <li key={p._id}>{p.name} (Expires: {formatToYYYYMMDDWithTime(new Date(p.expiryDate))})</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground mt-1">沒有即將過期的商品。</p>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
