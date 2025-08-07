import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import logoImg from "@/assets/Annie's-Way-LOGO-new.png";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  UserCog,
  LogOut,
  FolderTree,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Button } from '@/components/ui/button';

type UserRole = 'admin' | 'employee';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: '儀表板', icon: LayoutDashboard, roles: ['admin', 'employee'] },
  { 
    href: '/products', 
    label: '產品', 
    icon: Package, 
    roles: ['admin', 'employee'],
    children: [
      { href: '/categories', label: '產品分類', icon: FolderTree, roles: ['admin', 'employee'] },
    ]
  },
  { href: '/inventory', label: '庫存', icon: Warehouse, roles: ['admin', 'employee'] },
  { 
    href: '/orders', 
    label: '訂單', 
    icon: ShoppingCart, 
    roles: ['admin', 'employee'],
    children: [
      { href: '/orders/create', label: '建立訂單', icon: ShoppingCart, roles: ['admin', 'employee'] },
      { href: '/admin/deleted-orders', label: '已刪除訂單', icon: Trash2, roles: ['admin'] },
    ]
  },
  { 
    href: '/customers', 
    label: '客戶', 
    icon: Users, 
    roles: ['admin', 'employee'],
    children: [
      { href: '/customer-categories', label: '客戶分類', icon: FolderTree, roles: ['admin', 'employee'] },
    ]
  },
  { href: '/admin/users', label: '使用者管理', icon: UserCog, roles: ['admin'] },
];

export function SidebarNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { isMobile, setOpenMobile } = useSidebar(); // Use the hook

  if (!user) return null;

  const handleNavigation = (action: () => void) => {
    action();
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') {
      return '??';
    }
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };
  
  const handleParentItemClick = (href: string) => {
    // Only navigate if it's not the current path, otherwise just toggle
    if (location.pathname !== href) {
        navigate(href);
    }
    toggleExpanded(href);

    // Close on mobile if it's a direct parent click
    if (isMobile) {
        setOpenMobile(false);
    }
  };

  const isExpanded = (href: string) => expandedItems.includes(href);
  const isActive = (href: string) => location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href));

  return (
    <Sidebar collapsible="offcanvas" side="left" className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex flex-col items-center">
          <img 
            src={logoImg}
            alt="Annie's Way Logo" 
            className="w-full h-auto object-contain flex-shrink-0 p-4" 
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-grow">
        <SidebarMenu>
          {navItems
            .filter(item => item.roles.includes(user.role))
            .map((item) => (
              <SidebarMenuItem key={item.href}>
                {item.children ? (
                  <>
                    <SidebarMenuButton
                      onClick={() => handleParentItemClick(item.href)}
                      isActive={isActive(item.href)}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      <ChevronDown className={cn(
                        "ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
                        isExpanded(item.href) && "rotate-180"
                      )} />
                    </SidebarMenuButton>
                    {isExpanded(item.href) && (
                      <SidebarMenuSub>
                        {item.children
                          .filter(child => child.roles.includes(user.role))
                          .map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <NavLink to={child.href} onClick={() => handleNavigation(() => {})}>
                                {({ isActive: isChildActive }) => (
                                  <SidebarMenuSubButton isActive={isChildActive} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                    <child.icon className="h-4 w-4" />
                                    <span className="group-data-[collapsible=icon]:hidden">{child.label}</span>
                                  </SidebarMenuSubButton>
                                )}
                              </NavLink>
                            </SidebarMenuSubItem>
                          ))}
                      </SidebarMenuSub>
                    )}
                  </>
                ) : (
                  <NavLink to={item.href} onClick={() => handleNavigation(() => {})}>
                    {({ isActive: isItemActive }) => (
                      <SidebarMenuButton isActive={isItemActive} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <item.icon className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                )}
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 p-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-10 w-10 border-2 border-white/50">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${user.fullName}&background=random`} alt={user.fullName || ''} />
            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-white">{user.fullName}</p>
            <p className="text-xs text-white/70">{user.email}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(logout)} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">登出</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
} 