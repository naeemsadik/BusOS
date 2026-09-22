"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import {
  BadgeDollarSign, Building2, CreditCard, FileText, Globe2, LayoutDashboard,
  LogOut, Megaphone, MessageSquare, Moon, Package, Receipt, Settings,
  ShoppingCart, Sun, Truck, User, Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Sidebar as SidebarRoot, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarRail, useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { LocaleToggle } from "@/components/locale-toggle"
import { useAuth } from "@/contexts/auth-context"
import { useNavPermissions } from "@/hooks/use-nav-permissions"
import { brandConfig } from "@/lib/brand-config"
import { PermissionModuleType, SubscriptionStatus, UserRole } from "@/lib/types"

const groups = [
  { label: "sell", items: [
    { label: "dashboard", href: "/dashboard", icon: LayoutDashboard, module: PermissionModuleType.DASHBOARD },
    { label: "pos", href: "/pos", icon: ShoppingCart, module: PermissionModuleType.POS },
    { label: "orders", href: "/orders", icon: Receipt, module: PermissionModuleType.ORDERS },
  ]},
  { label: "catalog", items: [
    { label: "inventory", href: "/inventory", icon: Package, module: PermissionModuleType.INVENTORY },
    { label: "customers", href: "/customers", icon: Users, module: PermissionModuleType.CUSTOMERS },
    { label: "suppliers", href: "/suppliers", icon: Building2, module: PermissionModuleType.SUPPLIERS },
  ]},
  { label: "operations", items: [
    { label: "expenses", href: "/expenses", icon: CreditCard, module: PermissionModuleType.EXPENSES },
    { label: "reports", href: "/reports", icon: FileText, module: PermissionModuleType.REPORTS },
    { label: "delivery", href: "/delivery", icon: Truck, module: PermissionModuleType.DELIVERY },
  ]},
  { label: "growth", items: [
    { label: "website", href: "/website", icon: Globe2, module: PermissionModuleType.SETTINGS },
    { label: "contentStudio", href: "/social-content", icon: Megaphone, module: PermissionModuleType.SETTINGS },
    { label: "sms", href: "/sms", icon: MessageSquare, module: PermissionModuleType.PAYMENTS },
  ]},
  { label: "account", items: [
    { label: "subscription", href: "/subscription", icon: BadgeDollarSign, module: PermissionModuleType.PAYMENTS },
    { label: "settings", href: "/settings", icon: Settings, module: PermissionModuleType.SETTINGS },
  ]},
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const t = useTranslations("navigation")
  const common = useTranslations("common")
  const { setOpenMobile } = useSidebar()
  const { setTheme, resolvedTheme } = useTheme()
  const { logout, user } = useAuth()
  const { modulePermissions, loading } = useNavPermissions({ userId: user?.id || "", role: user?.role || UserRole.STAFF })
  const subscription = user?.organization?.subscription
  const isExpired = !subscription || subscription.status === SubscriptionStatus.EXPIRED || subscription.status === SubscriptionStatus.SUSPENDED || new Date() > new Date(subscription.endDate)

  const canSee = (item: (typeof groups)[number]["items"][number]) => {
    if (!user || !modulePermissions) return false
    if (isExpired) return item.href === "/subscription"
    if (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) return true
    return modulePermissions[item.module] === true
  }

  return (
    <SidebarRoot collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex h-10 items-center gap-3 px-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm">B</span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold">{brandConfig.name}</p>
            <p className="truncate text-xs text-muted-foreground">Commerce, clearly run</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {loading ? (
          <SidebarGroup><SidebarMenu>{Array.from({ length: 7 }).map((_, index) => <SidebarMenuSkeleton key={index} showIcon />)}</SidebarMenu></SidebarGroup>
        ) : groups.map((group) => {
          const visibleItems = group.items.filter(canSee)
          if (!visibleItems.length) return null
          return (
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href || pathname?.startsWith(`${item.href}/`)} tooltip={t(item.label)}>
                        <Link href={item.href} onClick={() => setOpenMobile(false)}><item.icon aria-hidden="true" /><span>{t(item.label)}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="mb-1 flex items-center justify-between gap-1 group-data-[collapsible=icon]:flex-col">
          <LocaleToggle compact />
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label={common("theme")}>
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={common("profile")}>
                  <Avatar className="size-8 rounded-lg"><AvatarImage src={user?.organization?.logo || "/placeholder.svg"} alt="" /><AvatarFallback className="rounded-lg bg-accent text-accent-foreground">{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1 text-left text-sm leading-tight"><span className="block truncate font-semibold">{user ? `${user.firstName} ${user.lastName}` : "User"}</span><span className="block truncate text-xs text-muted-foreground">{user?.email}</span></div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuItem asChild><Link href="/profile"><User className="mr-2 size-4" />{common("profile")}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}><LogOut className="mr-2 size-4" />{common("logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  )
}
