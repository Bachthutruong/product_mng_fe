import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesSummary } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['salesSummary', date],
    queryFn: () => getSalesSummary({ 
      startDate: date?.from?.toISOString() ?? '', 
      endDate: date?.to?.toISOString() ?? '' 
    }),
    enabled: !!date?.from && !!date?.to, // Only run query when dates are selected
  });

  const summary = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">報表</h1>
        <div className="flex items-center gap-2">
          <DatePickerWithRange date={date} onDateChange={setDate} />
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : "生成報表"}
          </Button>
        </div>
      </div>
      
      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div> :
       isError ? <div className="text-red-500">載入報表失敗。</div> :
      (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>總收入</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>總訂單數</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{summary?.totalOrders || 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>平均訂單金額</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(summary?.averageOrderValue || 0)}</p></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
