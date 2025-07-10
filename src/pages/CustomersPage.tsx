import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomers, deleteCustomer } from "@/services/api";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { EditCustomerDialog } from "@/components/customers/EditCustomerDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Trash2, UserPlus, Edit3, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatToYYYYMMDD, formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { keepPreviousData } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Customer } from "@/types";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = ITEMS_PER_PAGE_OPTIONS[0];

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customers', page, searchTerm, itemsPerPage],
    queryFn: () => getCustomers({ page, limit: itemsPerPage, search: searchTerm }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      toast({ title: "成功", description: "客戶已成功刪除。" });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "錯誤", description: error.response?.data?.error || "刪除客戶失敗。" });
    },
  });

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleItemsPerPageChange = (newSize: string) => {
    setItemsPerPage(parseInt(newSize, 10));
    setPage(1); // Reset to the first page when changing page size
  };

  const customers = data?.data || [];
  const pagination = data?.pagination;
  
  const TableSkeleton = () => (
    Array.from({ length: itemsPerPage }).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell>
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[120px] mt-2" />
        </TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell className="text-right space-x-2">
          <Skeleton className="h-8 w-8 inline-block" />
          <Skeleton className="h-8 w-8 inline-block" />
        </TableCell>
      </TableRow>
    ))
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">客戶管理</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> 新增客戶
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>客戶列表</CardTitle>
            <CardDescription>在這裡管理您的客戶。</CardDescription>
            <div className="mt-4">
              <Input
                placeholder="依姓名、電子郵件或電話搜尋..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isError ? (
              <div className="text-red-500 text-center py-10">錯誤: {error.message}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>聯絡資訊</TableHead>
                      <TableHead>類別</TableHead>
                      <TableHead>加入於</TableHead>
                      <TableHead>最後更新</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <TableSkeleton /> : 
                      customers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                找不到客戶。
                            </TableCell>
                        </TableRow>
                      ) : (
                        customers.map((customer: Customer) => (
                          <TableRow key={customer._id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>
                              <div>{customer.email || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{customer.phone}</div>
                            </TableCell>
                            <TableCell>{customer.categoryName || 'N/A'}</TableCell>
                            <TableCell>{formatToYYYYMMDD(new Date(customer.createdAt))}</TableCell>
                            <TableCell>{formatToYYYYMMDDWithTime(new Date(customer.updatedAt))}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/customers/${customer._id}/orders`}>
                                  <ShoppingBag className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeletePrompt(customer)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
                {!isLoading && pagination && pagination.totalPages > 0 && (
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
                        第 {pagination.currentPage} 頁，共 {pagination.totalPages} 頁
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!pagination.hasPrevPage || isLoading}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" /> 上一頁
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!pagination.hasNextPage || isLoading}
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

      <AddCustomerDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {selectedCustomer && (
        <EditCustomerDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          customer={selectedCustomer}
        />
      )}

      {selectedCustomer && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作無法復原。這將永久刪除客戶 "{selectedCustomer.name}"。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedCustomer._id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "刪除中..." : "刪除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
