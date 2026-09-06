"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/brand-config"
import { useNavPermissions } from "@/hooks/use-nav-permissions"
import { PermissionModuleType, UserRole, SubscriptionStatus } from "@/lib/types"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Receipt,
  TrendingUp,
  Settings,
  CreditCard,
  MessageSquare,
  FileText,
  Gift,
  Building,
  Phone,
  User,
  LogOut,
  Moon,
  Sun,
  BadgeDollarSign,
  X,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: PermissionModuleType.DASHBOARD,
  },
  {
    name: "POS",
    href: "/pos",
    icon: ShoppingCart,
    module: PermissionModuleType.POS,
  },
  {
    name: "Orders",
    href: "/orders",
    icon: Receipt,
    module: PermissionModuleType.ORDERS,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
    module: PermissionModuleType.INVENTORY,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    module: PermissionModuleType.CUSTOMERS,
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: Building,
    module: PermissionModuleType.SUPPLIERS,
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: CreditCard,
    module: PermissionModuleType.EXPENSES,
  },
  // {
  //   name: "Delivery",
  //   href: "/delivery",
  //   icon: Truck,
  //   module: PermissionModuleType.DELIVERY,
  // },
  {
    name: "Reports",
    href: "/reports",
    icon: TrendingUp,
    module: PermissionModuleType.REPORTS,
  },
  {
    name: "SMS Gateway",
    href: "/sms",
    icon: MessageSquare,
    module: PermissionModuleType.PAYMENTS,
  },
  {
    name: "Subscriptions",
    href: "/subscription",
    icon: BadgeDollarSign,
    module: PermissionModuleType.PAYMENTS,
  },
  {
    name: "Content Studio",
    href: "/social-content",
    icon: Megaphone,
    module: PermissionModuleType.SETTINGS,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    module: PermissionModuleType.SETTINGS,
  },
]

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onClose,
  isMobile = false,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const { logout, user } = useAuth()
  const { modulePermissions, loading: permissionsLoading } = useNavPermissions({
    userId: user?.id || '',
    role: user?.role || UserRole.STAFF,
  });

  // Check subscription status
  const subscription = user?.organization?.subscription;
  const isSubscriptionExpired = !subscription ||
    subscription.status === SubscriptionStatus.EXPIRED ||
    subscription.status === SubscriptionStatus.SUSPENDED ||
    (subscription.status === SubscriptionStatus.TRIAL && new Date() > new Date(subscription.endDate)) ||
    (subscription.status === SubscriptionStatus.CANCELLED && new Date() > new Date(subscription.endDate)) ||
    (subscription.status === SubscriptionStatus.ACTIVE && new Date() > new Date(subscription.endDate));

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  };

  // Filter navigation items based on permissions and subscription status
  const filteredNavigation = navigation.filter(item => {
    // During loading, show nothing for better UX
    if (permissionsLoading) return false;

    // If no user or no modulePermissions, show nothing
    if (!user || !modulePermissions) return false;

    // If subscription is expired, only show Subscriptions page
    if (isSubscriptionExpired) {
      return item.href === '/subscription';
    }

    // Owners and admins can see all modules
    if (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) return true;

    // For all other roles, check permissions for every module (including dashboard)
    return modulePermissions[item.module] === true;
  });

  return (
    <div className={cn(
      "flex flex-col h-full bg-card dark:bg-card border-r dark:border-zinc-800 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header with brand name and theme toggle */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">{brandConfig.name}</h2>
              <Link
                href={brandConfig.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors hidden sm:block"
              >
                {brandConfig.shortDescription}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="bg-secondary/50 hover:bg-secondary dark:bg-secondary/20 dark:hover:bg-secondary/30"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="bg-secondary/50 hover:bg-secondary dark:bg-secondary/20 dark:hover:bg-secondary/30"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            {isMobile && onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className={cn("flex-1", isCollapsed ? "px-1" : "px-3")}>
        <div className="space-y-1">
          {permissionsLoading ? (
            <div className={cn(
              "py-4 text-center text-sm text-muted-foreground",
              isCollapsed ? "px-0" : "px-2"
            )}>
              {isCollapsed ? "..." : "Loading navigation..."}
            </div>
          ) : filteredNavigation.length === 0 ? (
            <div className={cn(
              "py-4 text-center text-sm text-muted-foreground",
              isCollapsed ? "px-0" : "px-2"
            )}>
              {isCollapsed ? "!" : "No accessible modules"}
            </div>
          ) : (
            filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive && "bg-secondary dark:bg-secondary/80",
                    isCollapsed && "px-2"
                  )}
                  title={item.name}
                  asChild
                >
                  <Link href={item.href} onClick={handleNavClick}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 text-left truncate">{item.name}</span>
                    )}
                  </Link>
                </Button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* User profile section */}
      <div className="border-t dark:border-zinc-800 mt-auto p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2",
                isCollapsed ? "justify-center px-2 w-full" : "justify-start px-2 w-full"
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage
                  src={user?.organization?.logo || "/placeholder.svg"}
                  alt={user?.organization?.name || "Organization"}
                />
                <AvatarFallback>
                  {user?.organization?.name ? user.organization.name[0].toUpperCase() :
                    user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none truncate w-full text-foreground dark:text-foreground">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate w-full">{user?.email || 'user@example.com'}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile" onClick={handleNavClick}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log('Logout clicked');
              logout();
            }}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
