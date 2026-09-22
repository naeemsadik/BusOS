import type { LucideIcon } from "lucide-react"
import { AlertCircle, Inbox, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function PageToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between", className)}>
      {children}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  icon: LucideIcon
  tone?: "primary" | "accent" | "success" | "warning"
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent text-accent-foreground",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  }

  return (
    <Card className="min-h-36 overflow-hidden shadow-sm">
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-5">
          <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
          {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

const statusTone = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
}

export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof statusTone }) {
  return <Badge variant="outline" className={cn("font-medium", statusTone[tone])}>{children}</Badge>
}

export function DataState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
}: {
  kind: "empty" | "error"
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  const Icon = kind === "error" ? AlertCircle : Inbox
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <span className={cn("mb-4 grid size-11 place-items-center rounded-xl", kind === "error" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-5" onClick={onAction}>
          <RefreshCw className="mr-2 size-4" />{actionLabel}
        </Button>
      )}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading content" role="status">
      <div className="space-y-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
