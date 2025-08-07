import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrder } from '@/services/api';
import { EditOrderForm } from '@/components/orders/EditOrderForm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });

  const order = data?.data;

  const PageSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
       <Button variant="outline" onClick={() => navigate('/orders')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回訂單列表
      </Button>

      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <div className="text-red-500 text-center py-10">錯誤: {error.message}</div>
      ) : order ? (
        <EditOrderForm order={order} />
      ) : (
        <div className="text-center py-10">找不到訂單。</div>
      )}
    </div>
  );
} 