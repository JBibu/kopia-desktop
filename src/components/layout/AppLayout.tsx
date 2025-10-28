/**
 * Main app layout with sidebar and content area
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Titlebar } from './Titlebar';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks';

export function AppLayout() {
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
        {/* Mobile Header with Menu Toggle */}
        {isMobile && (
          <header className="sticky top-8 z-10 flex h-12 items-center gap-4 border-b bg-background px-4 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </header>
        )}

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
