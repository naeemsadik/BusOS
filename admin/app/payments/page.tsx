"use client"

import { useEffect, useState } from "react"
import { CreditCard, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataState, PageHeader, PageSkeleton } from "@/components/ui/page-primitives"
import { PaymentsService } from "@/lib/payments-service"

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [error, setError] = useState("")
  const [refunding, setRefunding] = useState<string | null>(null)

  const loadPayments = async () => {
    setLoading(true); setError("")
    try { setPayments(await PaymentsService.getPayments()) }
    catch (loadError: any) { setError(loadError?.response?.data?.message || "Payment data could not be loaded.") }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadPayments() }, [])

  const refund = async (paymentId: string) => {
    setRefunding(paymentId)
    try { await PaymentsService.refundPayment(paymentId); toast.success("Payment refunded"); await loadPayments() }
    catch (refundError: any) { toast.error(refundError?.response?.data?.message || "Payment could not be refunded") }
    finally { setRefunding(null) }
  }

  if (loading) return <PageSkeleton />
  if (error && payments.length === 0) return <DataState title="Payments unavailable" description={error} onRetry={loadPayments} />

  return <div className="mx-auto max-w-[100rem] space-y-6">
    <PageHeader title="Payments" description="Review platform transactions and process eligible refunds." actions={<Button variant="outline" onClick={loadPayments}><RefreshCw className="mr-2 size-4" />Refresh</Button>} />
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Card className="overflow-hidden shadow-sm"><CardContent className="p-0">
      <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Transaction</TableHead><TableHead>Payer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{payments.map(payment => <TableRow key={payment.id}><TableCell><p className="font-medium">{payment.trxId || payment.id}</p><p className="text-xs text-muted-foreground">{payment.id}</p></TableCell><TableCell>{payment.payerReference || "Not provided"}</TableCell><TableCell className="font-semibold tabular-nums">৳{Number(payment.amount || 0).toLocaleString()}</TableCell><TableCell><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${payment.status === "REFUNDED" ? "bg-muted text-muted-foreground" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>{payment.status}</span></TableCell><TableCell>{new Date(payment.createdAt).toLocaleString()}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" disabled={payment.status === "REFUNDED" || refunding === payment.id} onClick={() => refund(payment.id)}><RotateCcw className="mr-2 size-4" />Refund</Button></TableCell></TableRow>)}{payments.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No payment transactions found.</TableCell></TableRow>}</TableBody></Table></div>
      <div className="divide-y md:hidden">{payments.map(payment => <article key={payment.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{payment.trxId || payment.id}</p><p className="text-xs text-muted-foreground">{payment.payerReference}</p></div><CreditCard className="size-5 text-primary" /></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="font-bold">৳{Number(payment.amount || 0).toLocaleString()}</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><span className="text-sm font-medium">{payment.status}</span></div><Button className="w-full" size="sm" variant="outline" disabled={payment.status === "REFUNDED" || refunding === payment.id} onClick={() => refund(payment.id)}><RotateCcw className="mr-2 size-4" />Refund</Button></article>)}</div>
    </CardContent></Card>
  </div>
}
