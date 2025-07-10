import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNavigation } from '@/components/SidebarNavigation';

export default function Layout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <SidebarNavigation />
        <main className="flex-1 flex flex-col bg-background w-full">
          <div className="flex-1 p-4 overflow-auto w-full max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
} 