"use client"

import { useLocale } from "next-intl"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface SalesData { period: string; sales: number; orders: number; change?: string }

export function SalesChart({ data }: { data: SalesData[] }) {
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", { notation: "compact", maximumFractionDigits: 1 })

  return <div className="w-full">
    <div className="h-72 w-full" role="img" aria-label="Sales revenue chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 8, left: -12 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} minTickGap={24} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => number.format(value)} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.6)" }}
            contentStyle={{ background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)" }}
            formatter={(value: number, name: string) => [number.format(value), name === "sales" ? "Sales" : "Orders"]}
          />
          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[6, 6, 2, 2]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <table className="sr-only"><caption>Sales by period</caption><thead><tr><th>Period</th><th>Sales</th><th>Orders</th></tr></thead><tbody>{data.map(row => <tr key={row.period}><td>{row.period}</td><td>{row.sales}</td><td>{row.orders}</td></tr>)}</tbody></table>
  </div>
}
