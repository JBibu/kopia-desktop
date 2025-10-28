/**
 * Application sidebar using shadcn/ui sidebar component
 */

import { Link, useLocation } from 'react-router-dom';
import { Database, FolderArchive, Settings, ListTodo, Home, Shield } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: Home, description: 'System dashboard' },
  { name: 'Repository', path: '/repository', icon: Database, description: 'Storage connection' },
  { name: 'Snapshots', path: '/snapshots', icon: FolderArchive, description: 'Backup history' },
  { name: 'Policies', path: '/policies', icon: ListTodo, description: 'Backup rules' },
  { name: 'Preferences', path: '/preferences', icon: Settings, description: 'App settings' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight">Kopia UI</h1>
            <p className="text-xs text-muted-foreground">Backup Manager</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2 py-2">
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.description}>
                      <Link to={item.path} className="gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="px-4 py-3">
          <Separator className="mb-3" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Version {import.meta.env.VITE_APP_VERSION || '0.1.0'}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
