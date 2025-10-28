/**
 * Main app layout with sidebar and content area
 */

import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Home, Database, FolderArchive, ListTodo, Settings } from 'lucide-react';

const routeNames: Record<string, { name: string; icon: React.ElementType }> = {
  '/': { name: 'Overview', icon: Home },
  '/repository': { name: 'Repository', icon: Database },
  '/snapshots': { name: 'Snapshots', icon: FolderArchive },
  '/policies': { name: 'Policies', icon: ListTodo },
  '/preferences': { name: 'Preferences', icon: Settings },
};

export function AppLayout() {
  const location = useLocation();
  const currentRoute = routeNames[location.pathname] || { name: 'Kopia UI', icon: Home };
  const Icon = currentRoute.icon;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-1 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{currentRoute.name}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 md:p-8 max-w-7xl">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </SidebarProvider>
  );
}
