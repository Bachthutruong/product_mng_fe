import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { SidebarNavigation } from '@/components/SidebarNavigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
        <Button size="icon" variant="outline" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
        </Button>
    </header>
  );
}


export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <SidebarNavigation />
        <div className="flex flex-col w-full">
          <MobileHeader />
          <main className="flex-1 p-4 sm:px-6 sm:py-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
} 