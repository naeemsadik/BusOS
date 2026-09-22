import type { LucideIcon } from "lucide-react"
import { AlertCircle, Inbox, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">BusOS operations</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</header>
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "primary" }: { label: string; value: React.ReactNode; detail?: React.ReactNode; icon: LucideIcon; tone?: "primary" | "accent" | "success" | "warning" }) {
  const tones = { primary: "bg-primary/10 text-primary", accent: "bg-accent text-accent-foreground", success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400" }
  return <Card className="min-h-32 shadow-sm"><CardContent className="flex h-full flex-col justify-between p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}><Icon className="size-4" /></span></div><div className="mt-4"><p className="text-2xl font-bold tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div></CardContent></Card>
}

export function PageSkeleton() { return <div className="space-y-6" role="status" aria-label="Loading content"><div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div> }

export function DataState({ title, description, onRetry, empty = false }: { title: string; description: string; onRetry?: () => void; empty?: boolean }) {
  const Icon = empty ? Inbox : AlertCircle
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center"><span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-5" /></span><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>{onRetry && <Button variant="outline" className="mt-5" onClick={onRetry}><RefreshCw className="mr-2 size-4" />Try again</Button>}</div>
}
