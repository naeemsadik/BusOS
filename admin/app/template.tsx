"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { BarChart3, Building2, CreditCard, LogOut, MessageSquare, ShieldCheck, Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleToggle } from "@/components/locale-toggle"
import { useAdmin } from "@/contexts/admin-context"

const groups = [
  { label: "overview", items: [
    { label: "dashboard", href: "/dashboard", icon: BarChart3 },
  ]},
  { label: "platform", items: [
    { label: "organizations", href: "/organizations", icon: Building2 },
    { label: "subscriptions", href: "/subscriptions", icon: CreditCard },
    { label: "payments", href: "/payments", icon: CreditCard },
    { label: "sms", href: "/dashboard/sms", icon: MessageSquare },
    { label: "users", href: "/dashboard/users", icon: Users },
  ]},
] as const

function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations("navigation")
  const common = useTranslations("common")
  const router = useRouter()
  const { admin, isDemoMode, logout } = useAdmin()
  const handleLogout = () => { logout(); router.push("/login") }

  return <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader className="border-b border-sidebar-border p-3">
      <div className="flex h-10 items-center gap-3 px-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span>
        <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-bold">BusOS Control</p><p className="truncate text-xs text-muted-foreground">Platform operations</p></div>
      </div>
      {isDemoMode && <Badge variant="outline" className="mx-1 w-fit group-data-[collapsible=icon]:hidden">Development fixtures</Badge>}
    </SidebarHeader>
    <SidebarContent className="py-2">
      {groups.map(group => <SidebarGroup key={group.label} className="py-1">
        <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
        <SidebarGroupContent><SidebarMenu>{group.items.map(item => <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={t(item.label)}><Link href={item.href}><item.icon /><span>{t(item.label)}</span></Link></SidebarMenuButton>
        </SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
      </SidebarGroup>)}
    </SidebarContent>
    <SidebarFooter className="border-t border-sidebar-border p-2">
      <SidebarMenu><SidebarMenuItem><DropdownMenu>
        <DropdownMenuTrigger asChild><SidebarMenuButton size="lg" tooltip={common("profile")}>
          <Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-accent text-accent-foreground">{admin?.firstName?.[0]}{admin?.lastName?.[0]}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1 text-left text-sm leading-tight"><span className="block truncate font-semibold">{admin?.firstName} {admin?.lastName}</span><span className="block truncate text-xs text-muted-foreground">{admin?.email}</span></div>
        </SidebarMenuButton></DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56"><DropdownMenuLabel>{admin?.email}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 size-4" />{common("logout")}</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu></SidebarMenuItem></SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
}

function LoadingShell() {
  return <div className="min-h-screen bg-background p-6 sm:p-10" role="status" aria-label="Loading"><div className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-9 w-56" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div></div>
}

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAdmin()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("common")

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") router.push("/login")
  }, [isLoading, isAuthenticated, pathname, router])

  if (isLoading) return <LoadingShell />
  if (!isAuthenticated && pathname !== "/login") return null
  if (pathname === "/login") return <>{children}</>

  return <SidebarProvider defaultOpen>
    <AdminSidebar />
    <SidebarInset className="min-w-0 bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-xl md:px-6">
        <SidebarTrigger aria-label={t("toggleSidebar")} />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-sm font-semibold text-muted-foreground">Internal operations</span>
        <div className="ml-auto flex items-center gap-1"><LocaleToggle /><ThemeToggle /></div>
      </header>
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
    </SidebarInset>
  </SidebarProvider>
}
