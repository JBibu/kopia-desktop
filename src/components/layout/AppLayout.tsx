/**
 * Main app layout with sidebar and content area
 */

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
