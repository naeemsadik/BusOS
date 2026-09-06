"use client"

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { brandConfig } from '@/lib/brand-config'
import { formatEnUsDateTime } from '@/lib/date-utils'
import { getOrderStatusPdfColor } from '@/lib/order-status-utils'
import { Textarea } from "@/components/ui/textarea"
import { Download, FileText, Loader2 } from 'lucide-react'
import { Order, OrderQuery } from '@/lib/orders-service'
import { useToast } from '@/hooks/use-toast'

interface OrdersPDFExportProps {
  orders: Order[]
  totalOrders: number
  currentQuery: OrderQuery
  onRefreshOrders: (query: OrderQuery) => Promise<{ orders: Order[], total: number, totalPages: number }>
}

interface ExportSettings {
  includeFilters: boolean
  includeCustomerInfo: boolean
  includePaymentInfo: boolean
  includeShippingInfo: boolean
  includeItemDetails: boolean
  includeNotes: boolean
  orientation: 'portrait' | 'landscape'
  pageSize: 'a4' | 'a3' | 'letter'
  exportScope: 'current' | 'all' | 'filtered'
  customTitle: string
  includeStats: boolean
}

const OrdersPDFExport: React.FC<OrdersPDFExportProps> = ({
  orders,
  totalOrders,
  currentQuery,
  onRefreshOrders
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [settings, setSettings] = useState<ExportSettings>({
    includeFilters: true,
    includeCustomerInfo: true,
    includePaymentInfo: true,
    includeShippingInfo: false,
    includeItemDetails: true,
    includeNotes: false,
    orientation: 'landscape',
    pageSize: 'a4',
    exportScope: 'current',
    customTitle: '',
    includeStats: true,
  })

  const { toast } = useToast()

  const formatCurrency = (amount: number): string => {
    return `৳${amount.toLocaleString()}`
  }

  const getPaymentStatusColor = (status: string): [number, number, number] => {
    const colors: Record<string, [number, number, number]> = {
      paid: [34, 197, 94],
      pending: [245, 158, 11],
      partial: [249, 115, 22],
      failed: [239, 68, 68],
      refunded: [107, 114, 128],
      cod: [59, 130, 246],
    }
    return colors[status] || [107, 114, 128]
  }

  const generateOrderStats = (orderData: Order[]) => {
    const stats = {
      totalOrders: orderData.length,
      totalAmount: orderData.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: 0,
      statusBreakdown: {} as Record<string, number>,
      paymentBreakdown: {} as Record<string, number>,
      topCustomers: [] as Array<{ name: string, orders: number, total: number }>,
    }

    stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalAmount / stats.totalOrders : 0

    // Status breakdown
    orderData.forEach(order => {
      stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1
      stats.paymentBreakdown[order.paymentStatus] = (stats.paymentBreakdown[order.paymentStatus] || 0) + 1
    })

    // Top customers
    const customerMap = new Map<string, { orders: number, total: number }>()
    orderData.forEach(order => {
      const customerName = order.customerName || order.customer?.name || 'Unknown Customer'
      const existing = customerMap.get(customerName) || { orders: 0, total: 0 }
      customerMap.set(customerName, {
        orders: existing.orders + 1,
        total: existing.total + order.total
      })
    })

    stats.topCustomers = Array.from(customerMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return stats
  }

  const addHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    // Header background
    doc.setFillColor(249, 250, 251)
    doc.rect(0, 0, pageWidth, 50, 'F')

    // Company name
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(brandConfig.name, 20, 25)

    // Report title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    doc.text(title, 20, 35)

    // Date and time
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    const now = new Date()
    doc.text(`Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, pageWidth - 20, 25, { align: 'right' })

    return 60 // Return Y position after header
  }

  const addFiltersInfo = (doc: jsPDF, yPos: number, query: OrderQuery): number => {
    if (!settings.includeFilters) return yPos

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Applied Filters:', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)

    const filters: string[] = []
    if (query.search) filters.push(`Search: "${query.search}"`)
    if (query.status) filters.push(`Status: ${query.status}`)
    if (query.paymentStatus) filters.push(`Payment: ${query.paymentStatus}`)
    if (query.startDate) filters.push(`From: ${new Date(query.startDate).toLocaleDateString()}`)
    if (query.endDate) filters.push(`To: ${new Date(query.endDate).toLocaleDateString()}`)
    if (query.minAmount) filters.push(`Min Amount: ${formatCurrency(query.minAmount)}`)
    if (query.maxAmount) filters.push(`Max Amount: ${formatCurrency(query.maxAmount)}`)

    if (filters.length === 0) {
      doc.text('No filters applied - showing all orders', 25, yPos)
      yPos += 8
    } else {
      filters.forEach(filter => {
        doc.text(`• ${filter}`, 25, yPos)
        yPos += 6
      })
    }

    return yPos + 10
  }

  const addStatsSection = (doc: jsPDF, yPos: number, orderData: Order[]): number => {
    if (!settings.includeStats) return yPos

    const stats = generateOrderStats(orderData)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Order Statistics:', 20, yPos)
    yPos += 15

    // Summary cards
    const cardWidth = 120
    const cardHeight = 35
    const cardSpacing = 10
    let cardX = 20

    // Total Orders card
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 5, 5, 'F')
    doc.setFontSize(10)
    doc.setTextColor(30, 64, 175)
    doc.text('Total Orders', cardX + 10, yPos + 12)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(stats.totalOrders.toString(), cardX + 10, yPos + 25)

    // Total Amount card
    cardX += cardWidth + cardSpacing
    doc.setFillColor(236, 253, 245)
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 5, 5, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(5, 150, 105)
    doc.text('Total Amount', cardX + 10, yPos + 12)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(stats.totalAmount), cardX + 10, yPos + 25)

    // Average Order Value card
    cardX += cardWidth + cardSpacing
    doc.setFillColor(254, 243, 199)
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 5, 5, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(146, 64, 14)
    doc.text('Average Order', cardX + 10, yPos + 12)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(stats.averageOrderValue), cardX + 10, yPos + 25)

    yPos += cardHeight + 20

    return yPos
  }

  const generatePDF = async () => {
    if (isExporting) return

    try {
      setIsExporting(true)

      let ordersToExport: Order[] = []

      // Determine which orders to export
      if (settings.exportScope === 'current') {
        ordersToExport = orders
      } else if (settings.exportScope === 'all') {
        // Fetch all orders without pagination
        const allOrdersQuery = { ...currentQuery, page: undefined, limit: undefined }
        const response = await onRefreshOrders(allOrdersQuery)
        ordersToExport = response.orders
      } else if (settings.exportScope === 'filtered') {
        // Fetch all orders with current filters but no pagination
        const filteredQuery = { ...currentQuery, page: undefined, limit: undefined }
        const response = await onRefreshOrders(filteredQuery)
        ordersToExport = response.orders
      }

      if (ordersToExport.length === 0) {
        toast({
          title: "No Data",
          description: "No orders found to export",
          variant: "destructive"
        })
        return
      }

      // Create PDF
      const doc = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: settings.pageSize
      })

      const title = settings.customTitle || `Orders Report - ${ordersToExport.length} Orders`
      let yPos = addHeader(doc, title)

      // Add filters info
      yPos = addFiltersInfo(doc, yPos, currentQuery)

      // Add statistics
      yPos = addStatsSection(doc, yPos, ordersToExport)

      // Prepare table data
      const tableHeaders = ['Order #', 'Date']
      if (settings.includeCustomerInfo) tableHeaders.push('Customer')
      tableHeaders.push('Items', 'Total', 'Status')
      if (settings.includePaymentInfo) tableHeaders.push('Payment')
      if (settings.includeShippingInfo) tableHeaders.push('Tracking')

      const tableData = ordersToExport.map(order => {
        const row = [
          order.orderNumber,
          formatEnUsDateTime(order.createdAt)
        ]
        
        if (settings.includeCustomerInfo) {
          row.push(order.customerName || order.customer?.name || 'N/A')
        }
        
        row.push(
          `${order.items?.length || 0} items`,
          formatCurrency(order.total),
          order.status.toUpperCase()
        )
        
        if (settings.includePaymentInfo) {
          row.push(order.paymentStatus.toUpperCase())
        }
        
        if (settings.includeShippingInfo) {
          row.push(order.trackingNumber || 'N/A')
        }

        return row
      })

      // Generate main table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [31, 41, 55],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
        },
        didParseCell: (data) => {
          // Color code status columns
          if (data.column.index === tableHeaders.indexOf('Status') && data.section === 'body') {
            const status = ordersToExport[data.row.index].status
            const [r, g, b] = getOrderStatusPdfColor(status)
            data.cell.styles.textColor = [r, g, b]
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.column.index === tableHeaders.indexOf('Payment') && data.section === 'body') {
            const paymentStatus = ordersToExport[data.row.index].paymentStatus
            const [r, g, b] = getPaymentStatusColor(paymentStatus)
            data.cell.styles.textColor = [r, g, b]
            data.cell.styles.fontStyle = 'bold'
          }
        },
        margin: { top: 20, left: 20, right: 20 },
      })

      // Add detailed order items if requested
      if (settings.includeItemDetails) {
        doc.addPage()
        yPos = addHeader(doc, `${title} - Detailed Items`)

        ordersToExport.forEach((order, index) => {
          if (yPos > doc.internal.pageSize.height - 50) {
            doc.addPage()
            yPos = 30
          }

          // Order header
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(31, 41, 55)
          doc.text(`Order #${order.orderNumber}`, 20, yPos)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(75, 85, 99)
          doc.text(`Customer: ${order.customerName || 'N/A'} | Date: ${formatEnUsDateTime(order.createdAt)}`, 20, yPos + 8)
          yPos += 20

          // Items table
          const itemsData = order.items.map(item => [
            item.productName || item.name || 'N/A',
            item.productSku || item.sku || 'N/A',
            (item.quantity || 0).toString(),
            formatCurrency(item.unitPrice || item.price || 0),
            formatCurrency(item.total || (item.quantity * (item.unitPrice || item.price)) || 0)
          ])

          autoTable(doc, {
            head: [['Product Name', 'SKU', 'Qty', 'Unit Price', 'Total']],
            body: itemsData,
            startY: yPos,
            styles: {
              fontSize: 8,
              cellPadding: 2,
            },
            headStyles: {
              fillColor: [75, 85, 99],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
            },
            margin: { left: 20, right: 20 },
          })

          yPos = (doc as any).lastAutoTable.finalY + 15

          // Order summary
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(75, 85, 99)
          doc.text(`Subtotal: ${formatCurrency(order.subtotal)}`, 20, yPos)
          if (order.discountAmount > 0) {
            doc.text(`Discount: -${formatCurrency(order.discountAmount)}`, 20, yPos + 6)
            yPos += 6
          }
          if (order.taxAmount > 0) {
            doc.text(`Tax: ${formatCurrency(order.taxAmount)}`, 20, yPos + 6)
            yPos += 6
          }
          if (order.shippingAmount > 0) {
            doc.text(`Shipping: ${formatCurrency(order.shippingAmount)}`, 20, yPos + 6)
            yPos += 6
          }
          doc.setFont('helvetica', 'bold')
          doc.text(`Total: ${formatCurrency(order.total)}`, 20, yPos + 8)
          yPos += 20

          if (settings.includeNotes && order.notes) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.text(`Notes: ${order.notes}`, 20, yPos)
            yPos += 10
          }

          yPos += 10
        })
      }

      // Add footer to all pages
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const pageHeight = doc.internal.pageSize.height
        doc.setFontSize(8)
        doc.setTextColor(107, 114, 128)
        doc.text(
          `Generated by ${brandConfig.name} | Page ${i} of ${pageCount}`,
          20,
          pageHeight - 10
        )
        doc.text(
          `Total Orders: ${ordersToExport.length} | Total Value: ${formatCurrency(ordersToExport.reduce((sum, o) => sum + o.total, 0))}`,
          doc.internal.pageSize.width - 20,
          pageHeight - 10,
          { align: 'right' }
        )
      }

      // Save PDF
      const fileName = `orders_report_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      toast({
        title: "Success",
        description: `PDF report generated successfully with ${ordersToExport.length} orders`,
      })

      setIsOpen(false)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Export Orders as PDF
          </DialogTitle>
          <DialogDescription className="text-sm">
            Configure your PDF export settings and generate a comprehensive orders report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Export Scope */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm font-medium">Export Scope</Label>
            <Select value={settings.exportScope} onValueChange={(value: any) => setSettings({...settings, exportScope: value})}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Page ({orders.length} orders)</SelectItem>
                <SelectItem value="filtered">All Filtered Orders ({totalOrders} orders)</SelectItem>
                <SelectItem value="all">All Orders (All records)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Title */}
          <div className="space-y-2">
            <Label htmlFor="customTitle" className="text-sm">Report Title (Optional)</Label>
            <Input
              id="customTitle"
              placeholder="e.g., Monthly Orders Report"
              value={settings.customTitle}
              onChange={(e) => setSettings({...settings, customTitle: e.target.value})}
              className="text-sm"
            />
          </div>

          {/* Page Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Orientation</Label>
              <Select value={settings.orientation} onValueChange={(value: any) => setSettings({...settings, orientation: value})}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Page Size</Label>
              <Select value={settings.pageSize} onValueChange={(value: any) => setSettings({...settings, pageSize: value})}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Options */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm font-medium">Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeStats"
                  checked={settings.includeStats}
                  onCheckedChange={(checked) => setSettings({...settings, includeStats: checked as boolean})}
                />
                <Label htmlFor="includeStats" className="text-sm">Order Statistics & Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFilters"
                  checked={settings.includeFilters}
                  onCheckedChange={(checked) => setSettings({...settings, includeFilters: checked as boolean})}
                />
                <Label htmlFor="includeFilters" className="text-sm">Applied Filters</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCustomerInfo"
                  checked={settings.includeCustomerInfo}
                  onCheckedChange={(checked) => setSettings({...settings, includeCustomerInfo: checked as boolean})}
                />
                <Label htmlFor="includeCustomerInfo" className="text-sm">Customer Information</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePaymentInfo"
                  checked={settings.includePaymentInfo}
                  onCheckedChange={(checked) => setSettings({...settings, includePaymentInfo: checked as boolean})}
                />
                <Label htmlFor="includePaymentInfo" className="text-sm">Payment Status</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeShippingInfo"
                  checked={settings.includeShippingInfo}
                  onCheckedChange={(checked) => setSettings({...settings, includeShippingInfo: checked as boolean})}
                />
                <Label htmlFor="includeShippingInfo" className="text-sm">Shipping & Tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeItemDetails"
                  checked={settings.includeItemDetails}
                  onCheckedChange={(checked) => setSettings({...settings, includeItemDetails: checked as boolean})}
                />
                <Label htmlFor="includeItemDetails" className="text-sm">Detailed Item Breakdown</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeNotes"
                  checked={settings.includeNotes}
                  onCheckedChange={(checked) => setSettings({...settings, includeNotes: checked as boolean})}
                />
                <Label htmlFor="includeNotes" className="text-sm">Order Notes</Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 text-sm">
              Cancel
            </Button>
            <Button onClick={generatePDF} disabled={isExporting} className="flex-1 text-sm">
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrdersPDFExport
