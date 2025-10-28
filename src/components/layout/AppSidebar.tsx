/**
 * Application sidebar using shadcn/ui sidebar component
 */

import { Link, useLocation } from 'react-router-dom';
import { Database, FolderArchive, Settings, ListTodo, Home } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: Home },
  { name: 'Repository', path: '/repository', icon: Database },
  { name: 'Snapshots', path: '/snapshots', icon: FolderArchive },
  { name: 'Policies', path: '/policies', icon: ListTodo },
  { name: 'Preferences', path: '/preferences', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-16 items-center px-6">
          <h1 className="text-xl font-bold">Kopia UI</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link to={item.path}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            Kopia UI v{import.meta.env.VITE_APP_VERSION || '0.1.0'}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
