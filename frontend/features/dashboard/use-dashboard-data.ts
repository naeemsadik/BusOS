"use client"

import { useCallback, useEffect, useState } from "react"
import { dashboardService, type DashboardStats, type RecentActivity } from "@/lib/dashboard-service"
import { inventoryService, type Product } from "@/lib/inventory-service"
import { posService, type PosStats } from "@/lib/pos-service"
import { subscriptionService } from "@/lib/subscription-service"

export function useDashboardData(enabled: boolean) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [sales, setSales] = useState<PosStats | null>(null)
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(false)
    try {
      const [nextStats, nextActivity, nextSales, products, nextSubscription] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(6),
        posService.getSalesStats({ period: "this-month" }),
        inventoryService.getProducts({ stockStatus: "low_stock", limit: 5, sortBy: "stock", sortOrder: "ASC" }),
        subscriptionService.checkStatus(),
      ])
      setStats(nextStats)
      setActivity(nextActivity)
      setSales(nextSales)
      setLowStock(products.data)
      setSubscription(nextSubscription)
    } catch (loadError) {
      console.error("Failed to load dashboard", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { void load() }, [load])
  return { stats, activity, sales, lowStock, subscription, loading, error, reload: load }
}
