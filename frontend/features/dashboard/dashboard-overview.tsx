"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, AudioLines, Boxes, PackageCheck, Receipt, RefreshCw, ShoppingBag, TrendingUp, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataState, MetricCard, PageHeader, PageSkeleton, StatusBadge } from "@/components/ui/page-primitives"
import { SalesChart } from "@/components/charts/sales-chart"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { useCurrency } from "@/contexts/currency-context"
import type { User } from "@/lib/types"
import { SubscriptionStatus } from "@/lib/types"
import { useDashboardData } from "./use-dashboard-data"

function SectionTitle({ title, description, href, action }: { title: string; description: string; href?: string; action: string }) {
  return <div className="flex items-start justify-between gap-4"><div><CardTitle className="text-base sm:text-lg">{title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{href && <Button variant="ghost" size="sm" asChild><Link href={href}>{action}</Link></Button>}</div>
}

export function DashboardOverview({ user, onVoice }: { user: User; onVoice: () => void }) {
  const t = useTranslations("dashboard")
  const states = useTranslations("states")
  const locale = useLocale()
  const { formatCurrency } = useCurrency()
  const { stats, activity, sales, lowStock, subscription, loading, error, reload } = useDashboardData(true)
  const dateFormatter = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-BD", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

  if (loading && !stats) return <PageSkeleton />
  if (error && !stats) return <DataState kind="error" title={states("errorTitle")} description={states("errorDescription")} actionLabel={states("retry")} onAction={reload} />

  const subscriptionState = subscription?.subscription?.status
  const attention = [
    { title: t("pendingOrders"), description: t("pendingOrdersDescription"), count: stats?.orders.pending || 0, href: "/orders?status=pending", tone: "warning" as const },
    { title: t("lowStock"), description: t("lowStockDescription"), count: stats?.inventory.lowStockProducts || 0, href: "/inventory?stockStatus=low_stock", tone: "warning" as const },
    { title: t("outOfStock"), description: t("outOfStockDescription"), count: stats?.inventory.outOfStockProducts || 0, href: "/inventory?stockStatus=out_of_stock", tone: "danger" as const },
  ]

  return <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
    <PageHeader eyebrow={t("eyebrow")} title={t("title", { name: user.firstName })} description={t("description")} actions={<><Button variant="outline" onClick={() => void reload()}><RefreshCw className="mr-2 size-4" />{t("refresh")}</Button><Button onClick={onVoice}><AudioLines className="mr-2 size-4" />{t("voice")}</Button></>} />
    <EmailVerificationBanner />
    {subscriptionState === SubscriptionStatus.TRIAL && subscription?.daysRemaining <= 3 && <Alert className="border-amber-500/30 bg-amber-500/10"><AlertTriangle className="size-4 text-amber-700 dark:text-amber-400" /><AlertDescription>{t("subscriptionWarning", { count: subscription.daysRemaining })} <Link href="/subscription" className="font-semibold underline underline-offset-4">{t("manageSubscription")}</Link></AlertDescription></Alert>}
    {subscriptionState === SubscriptionStatus.EXPIRED && <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{t("subscriptionExpired")} <Link href="/subscription" className="font-semibold underline underline-offset-4">{t("manageSubscription")}</Link></AlertDescription></Alert>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business metrics">
      <MetricCard label={t("sales")} value={formatCurrency(stats?.sales.totalSales || 0)} detail={t("fromOrders", { count: stats?.sales.totalOrders || 0 })} icon={TrendingUp} tone="primary" />
      <MetricCard label={t("orders")} value={(stats?.overview.currentMonthOrders || 0).toLocaleString(locale)} detail={t("pendingCount", { count: stats?.orders.pending || 0 })} icon={Receipt} tone="accent" />
      <MetricCard label={t("customers")} value={(stats?.customers.active || 0).toLocaleString(locale)} detail={t("customerCount", { count: stats?.customers.total || 0 })} icon={Users} tone="success" />
      <MetricCard label={t("stock")} value={(stats?.inventory.totalProducts || 0).toLocaleString(locale)} detail={t("lowStockCount", { count: stats?.inventory.lowStockProducts || 0 })} icon={PackageCheck} tone="warning" />
    </section>

    <Card><CardHeader><SectionTitle title={t("attention")} description={t("attentionDescription")} action={t("viewAll")} /></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{attention.map(item => <Link key={item.title} href={item.href} className="group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"><span className="grid size-11 place-items-center rounded-xl bg-muted"><AlertTriangle className="size-5 text-muted-foreground" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="font-semibold">{item.title}</span><StatusBadge tone={item.tone}>{item.count}</StatusBadge></span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span></Link>)}</CardContent></Card>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
      <Card><CardHeader><SectionTitle title={t("salesTrend")} description={t("salesTrendDescription")} href="/reports" action={t("viewAll")} /></CardHeader><CardContent>{sales?.salesByPeriod?.length ? <SalesChart data={sales.salesByPeriod} /> : <DataState kind="empty" title={t("salesTrend")} description={states("emptyDescription")} />}</CardContent></Card>
      <Card><CardHeader><SectionTitle title={t("inventoryRisk")} description={t("inventoryRiskDescription")} href="/inventory" action={t("viewAll")} /></CardHeader><CardContent className="space-y-2">{lowStock.length ? lowStock.map(product => <Link key={product.id} href={`/inventory?search=${encodeURIComponent(product.name)}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/60"><span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400"><Boxes className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{product.name}</span><span className="text-xs text-muted-foreground">{product.sku || product.category}</span></span><StatusBadge tone={product.stock === 0 ? "danger" : "warning"}>{t("stockLeft", { count: product.stock })}</StatusBadge></Link>) : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("noRisk")}</p>}</CardContent></Card>
    </section>

    <Card><CardHeader><SectionTitle title={t("recentOrders")} description={t("recentOrdersDescription")} href="/orders" action={t("viewAll")} /></CardHeader><CardContent>{activity.length ? <div className="divide-y rounded-xl border">{activity.map(item => <div key={item.id} className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground"><ShoppingBag className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.description || t("unknownOrder")}</p><p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(item.createdAt))}</p></div>{item.status && <StatusBadge tone="info">{item.status}</StatusBadge>}<span className="hidden text-sm font-semibold tabular-nums sm:block">{item.amount ? formatCurrency(item.amount) : null}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("noOrders")}</p>}</CardContent></Card>
  </div>
}
