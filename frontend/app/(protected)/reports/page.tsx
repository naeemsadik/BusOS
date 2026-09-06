"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Loader2, Package, Download, Wrench, AlertCircle, CheckCircle } from "lucide-react"
import { posService, type ProfitStats, type SalesPeriod } from "@/lib/pos-service"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { pdfExportService } from "@/lib/pdf-export"
import { brandConfig } from "@/lib/brand-config"
import { api } from "@/lib/api"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"
import { useCurrency } from "@/contexts/currency-context"

export default function ReportsPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.REPORTS}>
      <ReportsPageContent />
    </PermissionGuardPage>
  )
}

function ReportsPageContent() {
  const { formatCurrency } = useCurrency()
  const [period, setPeriod] = useState<string>("last-30-days")
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  // Cost fix state
  const [isCheckingCosts, setIsCheckingCosts] = useState(false)
  const [isFixingCosts, setIsFixingCosts] = useState(false)
  const [costIssuesFound, setCostIssuesFound] = useState<number | null>(null)
  const [showCostFixAlert, setShowCostFixAlert] = useState(false)
  
  const { toast } = useToast()

  // Load profit data from API
  useEffect(() => {
    async function loadProfitData() {
      setLoading(true)
      try {
        const params: SalesPeriod = { period: period as any }
        const data = await posService.getProfitStats(params)
        setProfitStats(data)
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load profit analysis data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfitData()
  }, [period, toast])

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setPeriod(value)
  }

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!profitStats) {
      toast({
        title: 'No Data',
        description: 'No profit data available to export',
        variant: 'destructive',
      })
      return
    }

    setExporting(true)
    try {
      await pdfExportService.exportToPDF({
        profitStats,
        organizationName: brandConfig.name, // You can make this dynamic
      })
      
      toast({
        title: '🎉 PDF Export Successful!',
        description: 'Your comprehensive profit analysis report has been downloaded with beautiful formatting and insights.',
        variant: 'default',
      })
    } catch {
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF report. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  // Handle cost fix functionality
  const checkForCostIssues = async () => {
    setIsCheckingCosts(true)
    try {
      const response = await api.get('/pos/system/check-cost-issues')
      const data = response.data
      
      setCostIssuesFound(data.issuesFound)
      setShowCostFixAlert(true)
      
      if (data.issuesFound > 0) {
        toast({
          title: 'Cost Issues Found',
          description: 'Cost issues were found in order items. Click "Fix Issues" to correct them.',
          variant: 'default',
        })
      } else {
        toast({
          title: 'No Issues Found',
          description: 'All order items have correct cost data. Your profit calculations are accurate!',
          variant: 'default',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to check for cost issues. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCheckingCosts(false)
    }
  }

  const fixCostIssues = async () => {
    if (costIssuesFound === 0) return

    setIsFixingCosts(true)
    try {
      await api.post('/pos/system/fix-cost-issues')
      
      setCostIssuesFound(0)
      
      toast({
        title: '✅ Cost Issues Fixed!',
        description: 'Cost issues were corrected and profit analysis has been updated.',
        variant: 'default',
      })
      
      // Reload profit data to show corrected values
      const params: SalesPeriod = { period: period as any }
      const updatedStats = await posService.getProfitStats(params)
      setProfitStats(updatedStats)
      
    } catch {
      toast({
        title: 'Fix Failed',
        description: 'Failed to fix cost issues. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsFixingCosts(false)
    }
  }

  // Currency formatting is now handled by useCurrency hook

  const formatPercentage = (percentage: number) => {
    const formatted = [percentage.toFixed(1), '%'].join('')
    if (percentage >= 0) {
      return ['+', formatted].join('')
    }
    return formatted
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading profit analysis...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Profit Analysis</h1>
          <p className="text-muted-foreground">Detailed profit breakdown and insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select defaultValue={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-24-hours">Last 24 Hours</SelectItem>
              <SelectItem value="last-7-days">Last 7 Days</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              <SelectItem value="last-365-days">Last 365 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={checkForCostIssues} 
            disabled={isCheckingCosts}
            className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {isCheckingCosts ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Fix Costs
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF} 
            disabled={exporting || !profitStats}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cost Fix Alert */}
      {showCostFixAlert && (
        <Alert className={costIssuesFound && costIssuesFound > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
          <div className="flex items-center gap-2">
            {costIssuesFound && costIssuesFound > 0 ? (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={costIssuesFound && costIssuesFound > 0 ? "text-orange-700" : "text-green-700"}>
              {costIssuesFound && costIssuesFound > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <span>Found {costIssuesFound} order items with incorrect costs (unitCost = 0). This may affect your profit calculations.</span>
                  <Button 
                    size="sm" 
                    onClick={fixCostIssues}
                    disabled={isFixingCosts}
                    className="ml-4 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isFixingCosts ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      'Fix Issues'
                    )}
                  </Button>
                </div>
              ) : (
                "✅ All order items have correct cost data. Your profit calculations are accurate!"
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {profitStats ? (
        <>
            {/* Profit Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit (All Orders)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={profitStats.totalProfit >= 0 ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600'}>
                    {formatCurrency(profitStats.totalProfit)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All payment statuses included
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Orders Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className={profitStats.paidProfit >= 0 ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600'}>
                    {formatCurrency(profitStats.paidProfit)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paid orders only
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={profitStats.profitMargin >= 0 ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600'}>
                    {formatPercentage(profitStats.profitMargin)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Overall profit margin
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(profitStats.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gross sales revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(profitStats.totalCost)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cost of goods sold
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Profit Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Breakdown</CardTitle>
                <CardDescription>
                  Detailed profit calculation breakdown for {profitStats.period}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Revenue (Selling Price × Quantity):</span>
                    <span className="font-bold">{formatCurrency(profitStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Less: Total Cost (Cost Price × Quantity):</span>
                    <span className="font-bold text-red-600">-{formatCurrency(profitStats.totalCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Less: Total Discounts:</span>
                    <span className="font-bold text-yellow-600">-{formatCurrency(profitStats.totalDiscount)}</span>
                  </div>
                  <div className="border-t pt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Net Profit (All Orders):</span>
                      <span className={profitStats.totalProfit >= 0 ? 'text-lg font-bold text-green-600' : 'text-lg font-bold text-red-600'}>
                        {formatCurrency(profitStats.totalProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Net Profit (Paid Orders Only):</span>
                      <span className={profitStats.paidProfit >= 0 ? 'font-bold text-green-600' : 'font-bold text-red-600'}>
                        {formatCurrency(profitStats.paidProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Paid Profit Margin:</span>
                      <span className={profitStats.paidProfitMargin >= 0 ? 'text-sm font-medium text-green-600' : 'text-sm font-medium text-red-600'}>
                        {formatPercentage(profitStats.paidProfitMargin)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Profitable Products */}
            <Card>
              <CardHeader>
                <CardTitle>Most Profitable Products</CardTitle>
                <CardDescription>
                  Products ranked by total profit for {profitStats.period}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profitStats.topProfitableProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitStats.topProfitableProducts.slice(0, 10).map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                Avg. Price: {formatCurrency(product.averageSellingPrice)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{product.quantitySold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(product.totalCost)}</TableCell>
                          <TableCell className="text-right">
                            <span className={product.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(product.totalProfit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={product.profitMargin >= 20 ? 'default' : product.profitMargin >= 0 ? 'secondary' : 'destructive'}>
                              {formatPercentage(product.profitMargin)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No profitable products data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Summary */}
            {profitStats.summary.highestProfitProduct && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Highest Profit Product
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-semibold">{profitStats.summary.highestProfitProduct.productName}</div>
                      <div className="text-sm text-muted-foreground">
                        Profit: <span className="font-bold text-green-600">
                          {formatCurrency(profitStats.summary.highestProfitProduct.totalProfit)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Margin: <span className="font-bold">
                          {formatPercentage(profitStats.summary.highestProfitProduct.profitMargin)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {profitStats.summary.lowestProfitProduct && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        Lowest Profit Product
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="font-semibold">{profitStats.summary.lowestProfitProduct.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          Profit: <span className={profitStats.summary.lowestProfitProduct.totalProfit >= 0 ? 'font-bold text-green-600' : 'font-bold text-red-600'}>
                            {formatCurrency(profitStats.summary.lowestProfitProduct.totalProfit)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Margin: <span className="font-bold">
                            {formatPercentage(profitStats.summary.lowestProfitProduct.profitMargin)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No profit data available for this period</p>
          </div>
        )}
    </div>
  )
}
