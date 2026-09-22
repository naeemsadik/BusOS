"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { AppSidebar } from "@/components/sidebar"
import { LocaleToggle } from "@/components/locale-toggle"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/brand-config"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const t = useTranslations("common")
  const isAuthPage = pathname?.startsWith("/auth") || pathname === "/verify-email" || pathname === "/accept-invitation"
  if (isAuthPage || !isAuthenticated) return <main className="min-h-screen">{children}</main>

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-xl md:px-6">
          <SidebarTrigger aria-label={t("toggleSidebar")} />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-semibold md:hidden">{brandConfig.name}</span>
          <div className="ml-auto md:hidden"><LocaleToggle compact /></div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
