'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  Building2, 
  CreditCard, 
  Settings, 
  LogOut,
  Shield,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { useAdmin } from '../contexts/admin-context';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { toast } from 'sonner';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, isAuthenticated, isDemoMode, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Organizations', href: '/organizations', icon: Building2 },
    { name: 'Users', href: '/dashboard/users', icon: Users },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    { name: 'SMS', href: '/dashboard/sms', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-card border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            <span className="text-lg sm:text-xl font-bold text-foreground">Admin Portal</span>
            {isDemoMode && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
                Demo
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 sm:px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 sm:px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98]'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>

          {/* Mobile title with demo indicator */}
          <div className="flex items-center gap-2 lg:hidden">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Admin</span>
            {isDemoMode && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
                Demo
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {admin?.firstName?.[0]}{admin?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {admin?.firstName} {admin?.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {admin?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
    </div>
  );
}
