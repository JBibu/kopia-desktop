/**
 * Main app layout with sidebar and content area
 */

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Titlebar } from './Titlebar';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Home, Database, FolderArchive, ListTodo, Settings, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks';

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
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Custom Titlebar */}
      <Titlebar />

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex md:w-56 md:flex-col border-r bg-card pt-8">
          <AppSidebar />
        </aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-56 p-0">
            <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden pt-8">
        {/* Header */}
        <header className="sticky top-2 z-10 flex h-12 items-center gap-4 border-b bg-background px-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{currentRoute.name}</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster richColors closeButton position="bottom-right" />
    </div>
  );
}
