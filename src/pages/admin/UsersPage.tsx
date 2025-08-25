import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, deleteUser } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Search, Trash2, Users, UserX, Edit3 } from "lucide-react";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { formatToYYYYMMDDWithTime } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";

function DeleteUserButton({ user, currentUserId, onUserDeleted }: { user: User; currentUserId?: string; onUserDeleted: () => void }) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const mutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast({ title: "成功", description: `用戶 ${user.name} 已被刪除。` });
      onUserDeleted();
      setIsDeleting(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: error.response?.data?.error || "刪除用戶失敗。",
      });
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    mutation.mutate(user._id);
  };

  if (user._id === currentUserId || user.id === currentUserId) {
    return null; // Don't show delete button for the current user
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>您確定要刪除 "{user.name}"?</AlertDialogTitle>
          <AlertDialogDescription>此操作無法撤銷。將永久刪除該用戶帳戶。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { data, isLoading, isError, error } = useQuery({ 
    queryKey: ["users", searchTerm], 
    queryFn: () => getUsers(searchTerm),
  });

  const users = data?.data || [];

  const TableSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-16 inline-block" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" /> 用戶管理
        </h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0 md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="搜尋用戶..." 
              className="pl-8 w-full" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <AddUserDialog onUserAdded={() => queryClient.invalidateQueries({ queryKey: ['users'] })} />
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>員工帳戶</CardTitle>
          <CardDescription>管理員工登錄帳戶。</CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="text-red-500 text-center py-10">錯誤: {error.message}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>電子郵件</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>加入於</TableHead>
                  <TableHead>最後更新</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableSkeleton /> : 
                  users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <UserX className="w-16 h-16 text-muted-foreground mb-4" />
                          <h3 className="text-xl font-semibold text-foreground">找不到用戶</h3>
                          <p className="text-muted-foreground">
                            {searchTerm ? "找不到符合您搜尋的用戶。" : "目前沒有任何用戶。"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user: User) => (
                      <TableRow key={user._id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatToYYYYMMDDWithTime(new Date(user.createdAt))}</TableCell>
                        <TableCell>{formatToYYYYMMDDWithTime(new Date(user.updatedAt))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUser(user);
                                setIsEditDialogOpen(true);
                              }}
                              className="text-muted-foreground hover:text-primary"
                              title={`編輯用戶 ${user.name}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <DeleteUserButton 
                              user={user} 
                              currentUserId={currentUser?.id} 
                              onUserDeleted={() => queryClient.invalidateQueries({ queryKey: ['users', searchTerm] })} 
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <EditUserDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={editingUser}
        onUserUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['users', searchTerm] });
          setEditingUser(null);
        }}
      />
    </div>
  );
} 