"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Truck,
  Package,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Loader2,
  Printer,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
  DollarSign,
} from "lucide-react"
import { ordersService, Order, OrderQuery } from "@/lib/orders-service"
import { deliveryService } from "@/lib/delivery-service"
import { paperflySyncService } from "@/lib/paperfly-sync-service"
import { smsService } from "@/lib/sms-service"
import { useToast } from "@/hooks/use-toast"
import OrdersPDFExport from "@/components/orders/orders-pdf-export"
import OrderDetailsDialog from "@/components/orders/order-details-dialog"
import OrderEditDialog from "@/components/orders/order-edit-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { brandConfig } from "@/lib/brand-config"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"

export default function OrdersPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.ORDERS}>
      <OrdersPageContent />
    </PermissionGuardPage>
  )
}

function OrdersPageContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showTrackDialog, setShowTrackDialog] = useState(false)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  // Paperfly tracking dialog
  const [showPaperflyDialog, setShowPaperflyDialog] = useState(false)
  const [paperflyTrackingData, setPaperflyTrackingData] = useState<any>(null)
  const [loadingPaperflyData, setLoadingPaperflyData] = useState(false)

  // Pathao tracking state
  const [pathaoTracking, setPathaoTracking] = useState<any>(null)
  const [loadingPathao, setLoadingPathao] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Bulk operations
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showBulkSMSDialog, setShowBulkSMSDialog] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [bulkSMSMessage, setBulkSMSMessage] = useState("")
  const [bulkSMSType, setBulkSMSType] = useState<"invoice" | "confirmation" | "custom">("confirmation")
  const [sendingBulkSMS, setSendingBulkSMS] = useState(false)
  const [deletingOrders, setDeletingOrders] = useState(false)

  // Advanced filtering states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [amountFrom, setAmountFrom] = useState("")
  const [amountTo, setAmountTo] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [customerFilter, setCustomerFilter] = useState("")

  const { toast } = useToast()

  const openExternalUrl = (url: URL) => {
    window.open(url.toString(), "_blank", "noopener,noreferrer")
  }

  const openPaperflyTrackingPage = (order: Order) => {
    const trackingReference = order.paperflyOrderNumber || order.trackingNumber
    if (!trackingReference) {
      return
    }

    const url = new URL("https://go.paperfly.com.bd/track/order/")
    url.pathname = ["/track/order", encodeURIComponent(trackingReference)].join("/")
    openExternalUrl(url)
  }

  const openSteadfastPortal = () => {
    openExternalUrl(new URL("https://portal.packzy.com/"))
  }

  const openCourierSearch = (courierService: string, trackingNumber: string) => {
    const url = new URL("https://www.google.com/search")
    url.searchParams.set("q", [courierService, "tracking", trackingNumber].join(" "))
    openExternalUrl(url)
  }

  const openPaperflyMerchantTracking = (orderNumber: string) => {
    if (!orderNumber) {
      return
    }

    const url = new URL("https://go-app.paperfly.com.bd/merchant/api/react/order/track_order.php")
    url.searchParams.set("order_number", orderNumber)
    openExternalUrl(url)
  }

  // Helper function to build current query
  const buildCurrentQuery = (): OrderQuery => {
    const query: OrderQuery = {
      page: currentPage,
      limit: pageSize,
    }

    if (searchTerm.trim()) query.search = searchTerm.trim()
    if (activeTab !== "all") query.status = activeTab
    if (paymentStatusFilter !== "all") query.paymentStatus = paymentStatusFilter
    if (dateFrom) query.startDate = dateFrom
    if (dateTo) query.endDate = dateTo
    if (amountFrom) query.minAmount = parseFloat(amountFrom)
    if (amountTo) query.maxAmount = parseFloat(amountTo)
    if (customerFilter.trim()) query.search = customerFilter.trim()

    return query
  }

  // Helper function to refresh orders with current filters
  const refreshOrders = async () => {
    try {
      setLoading(true)
      const query = buildCurrentQuery()
      const response = await ordersService.getOrders(query)
      setOrders(response.orders)
      setTotalOrders(response.total)
      setTotalPages(response.totalPages)
      setSelectedOrders([])
    } catch (error) {
      console.error('Failed to refresh orders:', error)
      toast({
        title: "Error",
        description: "Failed to refresh orders. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to refresh orders with custom query for PDF export
  const refreshOrdersWithQuery = async (query: OrderQuery): Promise<{ orders: Order[], total: number, totalPages: number }> => {
    try {
      const response = await ordersService.getOrders(query)
      return {
        orders: response.orders,
        total: response.total,
        totalPages: response.totalPages
      }
    } catch (error) {
      console.error('Failed to fetch orders for export:', error)
      throw error
    }
  }

  // Load orders data with pagination and filtering
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true)

        const query = buildCurrentQuery()
        const response = await ordersService.getOrders(query)
        setOrders(response.orders)
        setTotalOrders(response.total)
        setTotalPages(response.totalPages)

        // Clear selected orders when data changes
        setSelectedOrders([])
      } catch (error) {
        console.error('Failed to load orders:', error)
        toast({
          title: "Error",
          description: "Failed to load orders. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [currentPage, pageSize, searchTerm, activeTab, paymentStatusFilter, dateFrom, dateTo, amountFrom, amountTo, customerFilter, toast])

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchTerm, activeTab, paymentStatusFilter, dateFrom, dateTo, amountFrom, amountTo, customerFilter])

  // Helper functions for pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "outline",
      processing: "outline",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
      returned: "destructive"
    }

    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "",
      returned: "",
    }

    return (
      <Badge variant={variants[status] || "secondary"} className={colors[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      partial: "outline",
      failed: "destructive",
      refunded: "outline",
      cod: "secondary"
    }

    const colors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-orange-100 text-orange-800",
      failed: "",
      refunded: "bg-gray-100 text-gray-800",
      cod: "bg-blue-100 text-blue-800"
    }

    return (
      <Badge variant={variants[status] || "secondary"} className={colors[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleSendInvoiceSMS = async (order: Order) => {
    if (!order.customerPhone) {
      toast({
        title: "Error",
        description: "Customer phone number is not available",
        variant: "destructive"
      })
      return
    }

    setSendingSMS(true)
    try {
      // Enhanced invoice SMS with more details
      const message = `Dear ${order.customerName || 'Customer'},

Your invoice for Order #${order.orderNumber} is ready:

Items: ${order.items.length} products
Total Amount: ৳${order.total.toLocaleString()}
Payment Status: ${order.paymentStatus.toUpperCase()}
Order Status: ${order.status.toUpperCase()}

Thank you for your order!

Best regards,
${brandConfig.name}`

      const result = await smsService.sendSms({
        recipient: order.customerPhone,
        message,
        type: 'Invoice'
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Invoice SMS sent successfully to customer",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to send SMS to customer",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send SMS",
        variant: "destructive"
      })
    } finally {
      setSendingSMS(false)
    }
  }

  // Bulk operations functions
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId])
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId))
    }
  }

  const handleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleBulkPrint = () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))

    if (selectedOrdersData.length === 0) {
      toast({
        title: "Error",
        description: "Please select orders to print",
        variant: "destructive"
      })
      return
    }

    // Generate combined invoice content for all selected orders
    const combinedInvoiceContent = `
      <!DOCTYPE html>
<html>
<head>
  <title>Elegant POS Slips</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      background: #fff;
      padding: 20px;
      margin: 0;
    }
    .page {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 14px;
    }
    .slip {
      width: 48%;
      height: 31%;
      padding: 16px 18px;
      box-sizing: border-box;
      border: 1px solid #000;
      border-radius: 6px;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.1);
    }

    .header {
      text-align: center;
      font-size: 15px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .info {
      font-size: 13px;
      line-height: 1.5;
    }
    .label {
      font-weight: bold;
      display: inline-block;
      width: 88px;
    }
    .product {
      font-size: 13px;
      margin-top: 10px;
      padding: 6px 10px;
      border: 1px dotted #aaa;
      background: #f9f9f9;
      font-style: italic;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .amount {
      margin-top: 10px;
      font-size: 14px;
      text-align: right;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .footer {
      font-size: 11px;
      text-align: center;
      margin-top: 14px;
      letter-spacing: 0.4px;
      color: #222;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .slip {
        border: 1px solid #000;
        page-break-inside: avoid;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>

    <div class="page">
      ${selectedOrdersData.map(order => `
      <!-- START SLIP -->
      <div class="slip">
      <div>
        <div class="header">${brandConfig.name}</div>
        <div class="info">
        <p><span class="label">Order ID:</span> ${order.orderNumber}</p>
        <p><span class="label">Name:</span> ${order.customerName || order.customer?.name || 'N/A'}</p>
        <p><span class="label">Phone:</span> ${order.customerPhone || order.customer?.phone || 'N/A'}</p>
        <p><span class="label">Address:</span> ${order.shippingAddress || 'N/A'}</p>
        </div>
        <div class="product">${order.items.map(item => item.productName).join(', ')}</div>
        <div class="amount">৳${order.total.toLocaleString()} ${order.paymentStatus === 'paid' ? 'PAID' : 'DUE'}</div>
      </div>
      <div class="footer">
        Merchant Copy • ${new Date(order.createdAt).toLocaleDateString('en-GB')} – ${new Date(order.createdAt).toLocaleTimeString()}<br>
        Thank you for shopping with us.
      </div>
      </div>
      <!-- END SLIP -->
      `).join('')}
    </div>

    <script>
      window.onload = () => window.print();
    </script>

    </body>
    </html>
      `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(combinedInvoiceContent)
      printWindow.document.close()
      toast({
        title: "Success",
        description: `Opening print dialog for ${selectedOrdersData.length} professional invoices...`,
      })
    } else {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your browser's popup settings.",
        variant: "destructive"
      })
    }
  }

  const handleBulkSMS = () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))

    if (selectedOrdersData.length === 0) {
      toast({
        title: "Error",
        description: "Please select orders to send SMS",
        variant: "destructive"
      })
      return
    }

    // Check if all selected orders have phone numbers
    const ordersWithoutPhone = selectedOrdersData.filter(order => !order.customerPhone)
    if (ordersWithoutPhone.length > 0) {
      toast({
        title: "Warning",
        description: `${ordersWithoutPhone.length} orders don't have phone numbers and will be skipped`,
        variant: "destructive"
      })
    }

    // Set default message based on type
    if (bulkSMSType === "confirmation") {
      setBulkSMSMessage("Dear {customerName}, your order #{orderNumber} has been confirmed and is being processed. Thank you for your business!")
    } else if (bulkSMSType === "invoice") {
      setBulkSMSMessage("Dear {customerName}, your invoice for order #{orderNumber} (Amount: {total}) is ready. Thank you for your business!")
    }

    setShowBulkSMSDialog(true)
  }

  const sendBulkSMS = async () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id) && order.customerPhone)

    if (selectedOrdersData.length === 0) {
      toast({
        title: "Error",
        description: "No orders with phone numbers selected",
        variant: "destructive"
      })
      return
    }

    setSendingBulkSMS(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const order of selectedOrdersData) {
        try {
          let message = bulkSMSMessage

          // Replace placeholders in message
          message = message
            .replace('{customerName}', order.customerName || 'Customer')
            .replace('{orderNumber}', order.orderNumber)
            .replace('{total}', `৳${order.total.toLocaleString()}`)
            .replace('{status}', order.status.toUpperCase())
            .replace('{paymentStatus}', order.paymentStatus.toUpperCase())

          const result = await smsService.sendSms({
            recipient: order.customerPhone!,
            message,
            type: bulkSMSType === "invoice" ? "promotional" : "transactional"
          })

          if (result.success) {
            successCount++
          } else {
            failCount++
          }

          // Small delay between SMS to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          failCount++
        }
      }

      toast({
        title: "Bulk SMS Complete",
        description: `Successfully sent: ${successCount}, Failed: ${failCount}`,
        variant: successCount > 0 ? "default" : "destructive"
      })

      setShowBulkSMSDialog(false)
      setSelectedOrders([])
      setBulkSMSMessage("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send bulk SMS",
        variant: "destructive"
      })
    } finally {
      setSendingBulkSMS(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))

    if (selectedOrdersData.length === 0) {
      toast({
        title: "Error",
        description: "Please select orders to delete",
        variant: "destructive"
      })
      return
    }

    // Add confirmation dialog for bulk delete
    if (!window.confirm('Are you sure you want to delete the selected orders? This action cannot be undone.')) {
      return
    }

    setDeletingOrders(true)
    const successfulOrderIds: string[] = []
    const failedOrderIds: string[] = []

    try {
      // Process orders in batches for better performance
      const batchSize = 5
      const pendingOrders = [...selectedOrdersData]
      while (pendingOrders.length > 0) {
        const batch = pendingOrders.splice(0, batchSize)
        await Promise.all(
          batch.map(async (order) => {
            try {
              await ordersService.deleteOrder(order.id, order.customerId || '', order.total)
              successfulOrderIds.push(order.id)
            } catch {
              failedOrderIds.push(order.id)
            }
          })
        )
      }

      toast({
        title: "Bulk Delete Complete",
        description: failedOrderIds.length > 0 ? "Some selected orders could not be deleted" : "Selected orders were deleted successfully",
        variant: successfulOrderIds.length > 0 ? "default" : "destructive"
      })

      setShowBulkDeleteDialog(false)
      setSelectedOrders([])

      // Refresh orders list
      await refreshOrders()

      // Trigger a custom event to notify other pages about the change
      window.dispatchEvent(new CustomEvent('ordersDeleted', {
        detail: { deletedOrders: selectedOrdersData }
      }))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete orders",
        variant: "destructive"
      })
    } finally {
      setDeletingOrders(false)
    }
  }

  const handlePrintInvoice = (order: Order) => {
    // Generate comprehensive invoice content for printing
    const invoiceContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>POS Invoice - ${order.orderNumber}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body class="bg-gray-100 p-4 sm:p-8">
      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 sm:p-12">
        <header class="flex justify-between items-start pb-8 border-b border-gray-200">
          <!-- Company Logo and Details -->
          <div>
            <div class="text-2xl font-bold text-gray-800">${brandConfig.name}</div>
            <p class="text-sm text-gray-500">123 Business Rd, Suite 100</p>
            <p class="text-sm text-gray-500">City, State, 12345</p>
            <p class="text-sm text-gray-500">contact@inventorypos.com</p>
          </div>

          <!-- Invoice Title and Details -->
          <div class="text-right">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-800 tracking-tight">INVOICE</h1>
            <div class="mt-4">
              <p class="text-sm text-gray-500">Invoice #: <span class="font-medium text-gray-700">${order.orderNumber}</span></p>
              <p class="text-sm text-gray-500">Date: <span class="font-medium text-gray-700">${new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</span></p>
            </div>
          </div>
        </header>

        <section class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Bill To Section -->
          <div>
            <h2 class="text-sm font-semibold text-gray-600 mb-2">BILL TO</h2>
            <p class="font-bold text-gray-800">${order.customerName || order.customer?.name || 'N/A'}</p>
            <p class="text-sm text-gray-500">${order.shippingAddress || 'N/A'}</p>
            <p class="text-sm text-gray-500">${order.shippingCity || ''}, ${order.shippingState || ''} ${order.shippingZipCode || ''}</p>
            <p class="text-sm text-gray-500">${order.customerEmail || order.customer?.email || 'N/A'}</p>
            <p class="text-sm text-gray-500">${order.customerPhone || order.customer?.phone || 'N/A'}</p>
          </div>

          <!-- Payment Details Section -->
          <div class="text-left md:text-right">
            <h2 class="text-sm font-semibold text-gray-600 mb-2">PAYMENT DETAILS</h2>
            <p class="text-sm text-gray-500">Payment Method: <span class="font-medium text-gray-700">${order.paymentMethod || 'N/A'}</span></p>
            <p class="text-sm text-gray-500">Payment Status: <span class="font-medium text-gray-700">${order.paymentStatus.toUpperCase()}</span></p>
            <p class="text-sm text-gray-500">Order Status: <span class="font-medium text-gray-700">${order.status.toUpperCase()}</span></p>
            ${order.trackingNumber ? `
            <p class="text-sm text-gray-500">Tracking: <span class="font-medium text-gray-700">${order.trackingNumber}</span></p>
            ` : ''}
          </div>
        </section>

        <section class="mt-12">
          <!-- Itemized List Table -->
          <div class="flow-root">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Item</th>
                      <th scope="col" class="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Qty</th>
                      <th scope="col" class="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Unit Price</th>
                      <th scope="col" class="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-0">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                    ${order.items.map(item => `
                    <tr>
                      <td class="py-4 pl-4 pr-3 text-sm sm:pl-0">
                        <div class="font-medium text-gray-900">${item.productName}</div>
                        ${item.productSku ? `<div class="text-gray-500">SKU: ${item.productSku}</div>` : ''}
                      </td>
                      <td class="px-3 py-4 text-center text-sm text-gray-500">${item.quantity}</td>
                      <td class="px-3 py-4 text-right text-sm text-gray-500">৳${item.unitPrice.toLocaleString()}</td>
                      <td class="py-4 pl-3 pr-4 text-right text-sm font-medium text-gray-900 sm:pr-0">৳${item.total.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-8">
          <!-- Totals Calculation -->
          <div class="max-w-sm ml-auto">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Subtotal</span>
                <span class="text-sm font-medium text-gray-800">৳${order.subtotal.toLocaleString()}</span>
              </div>
              ${order.discountAmount > 0 ? `
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Discount</span>
                <span class="text-sm font-medium text-green-600">-৳${order.discountAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              ${order.taxAmount > 0 ? `
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Tax</span>
                <span class="text-sm font-medium text-gray-800">৳${order.taxAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              ${order.shippingAmount > 0 ? `
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Delivery Charge</span>
                <span class="text-sm font-medium text-gray-800">৳${order.shippingAmount.toLocaleString()}</span>
              </div>
              ` : (order.shippingAddress || order.shippingCity) ? `
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Delivery Charge</span>
                <span class="text-sm font-medium text-green-600">FREE</span>
              </div>
              ` : ''}
              <div class="flex justify-between pt-2 border-t border-gray-200">
                <span class="text-base font-semibold text-gray-900">Grand Total</span>
                <span class="text-base font-semibold text-gray-900">৳${order.total.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Paid Amount</span>
                <span class="text-sm font-medium text-gray-800">৳${(order.paidAmount || 0).toLocaleString()}</span>
              </div>
              ${(order.total - (order.paidAmount || 0)) <= 0 ? `
              <div class="flex justify-between items-center mt-4 p-3 bg-green-100 rounded-lg">
                <span class="text-base font-bold text-gray-900">Amount Due</span>
                <span class="text-lg font-bold text-green-600">৳0.00</span>
              </div>
              ` : (order.paidAmount || 0) > 0 ? `
              <div class="flex justify-between items-center mt-4 p-3 bg-yellow-100 rounded-lg">
                <span class="text-base font-bold text-gray-900">Amount Due</span>
                <span class="text-lg font-bold text-yellow-600">৳${(order.total - (order.paidAmount || 0)).toLocaleString()}</span>
              </div>
              ` : `
              <div class="flex justify-between items-center mt-4 p-3 bg-red-100 rounded-lg">
                <span class="text-base font-bold text-gray-900">Amount Due</span>
                <span class="text-lg font-bold text-red-600">৳${order.total.toLocaleString()}</span>
              </div>
              `}
            </div>
          </div>
        </section>

        <footer class="mt-12 pt-8 border-t border-gray-200">
          <!-- Notes and Footer -->
          <div>
            <h3 class="text-sm font-semibold text-gray-600">Notes</h3>
            <p class="text-sm text-gray-500 mt-1">${order.notes || 'Thank you for your order! We hope to see you again soon.'}</p>
          </div>
          <div class="mt-8 text-center text-sm text-gray-400">
            <p>Powered by ${brandConfig.name}</p>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </footer>
      </div>

      <!-- Print Button -->
      <div class="max-w-4xl mx-auto mt-6 text-center no-print">
        <button onclick="window.print()" class="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Print Invoice
        </button>
      </div>
    </body>
    </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(invoiceContent)
      printWindow.document.close()
    } else {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your browser's popup settings.",
        variant: "destructive"
      })
    }
  }

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      await ordersService.updateOrder(orderId, { paymentStatus: paymentStatus as any })
      toast({
        title: "Success",
        description: "Payment status and invoice status were synchronized successfully.",
      })
      // Reload orders with current query to see the changes
      await refreshOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update payment status",
        variant: "destructive"
      })
    }
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowViewDialog(true)
  }

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowEditDialog(true)
  }

  const handleSaveOrderEdit = async (orderData: any) => {
    if (!selectedOrder) return

    setSavingOrder(true)
    try {
      await ordersService.updateOrder(selectedOrder.id, orderData)
      toast({
        title: "Success",
        description: "Order updated successfully",
      })
      setShowEditDialog(false)
      await refreshOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update order",
        variant: "destructive"
      })
    } finally {
      setSavingOrder(false)
    }
  }

  const handleMarkAsPaid = async (order: Order) => {
    try {
      await ordersService.updateOrder(order.id, {
        paidAmount: order.total,
        paymentStatus: 'paid'
      })
      toast({
        title: "Success",
        description: "Order marked as paid successfully",
      })
      setShowViewDialog(false)
      await refreshOrders()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      })
    }
  }

  const handleTrackDelivery = (order: Order) => {
    setSelectedOrder(order)
    setPathaoTracking(null) // Reset previous tracking data
    setShowTrackDialog(true)
  }

  // Manual function to fetch Pathao tracking
  const fetchPathaoTracking = async () => {
    if (!selectedOrder) return

    const trackingNumber = selectedOrder.trackingNumber ?? '';
    const phone = selectedOrder.customerPhone ?? '';

    if (!trackingNumber || !phone) {
      toast({
        title: "Error",
        description: "Missing tracking number or customer phone",
        variant: "destructive"
      })
      return
    }

    setLoadingPathao(true)
    try {
      const trackingResult = await deliveryService.trackPathaoDelivery(trackingNumber, phone)
      setPathaoTracking(trackingResult)

      toast({
        title: "Success",
        description: "Pathao tracking data loaded successfully",
      })
    } catch (error) {
      console.error('Failed to fetch Pathao tracking:', error)
      setPathaoTracking(null)
      toast({
        title: "Error",
        description: "Failed to load Pathao tracking data",
        variant: "destructive"
      })
    } finally {
      setLoadingPathao(false)
    }
  }

  const clearAdvancedFilters = () => {
    setDateFrom("")
    setDateTo("")
    setAmountFrom("")
    setAmountTo("")
    setPaymentStatusFilter("all")
    setCustomerFilter("")
    setShowAdvancedFilters(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading orders...</span>
      </div>
    )
  }

  const orderStats = {
    total: totalOrders,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Track and manage all customer orders</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await refreshOrders()
              toast({
                title: "Success",
                description: "Orders refreshed successfully",
              })
            }}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await paperflySyncService.performSync(true)
                await refreshOrders()
                toast({
                  title: "Success",
                  description: "Paperfly orders synced successfully",
                })
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to sync Paperfly orders",
                  variant: "destructive"
                })
              }
            }}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync status
          </Button>
          <OrdersPDFExport
            orders={orders}
            totalOrders={totalOrders}
            currentQuery={buildCurrentQuery()}
            onRefreshOrders={refreshOrdersWithQuery}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orderStats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{orderStats.shipped}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{orderStats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Status and Pagination Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
          </span>
          {(dateFrom || dateTo || amountFrom || amountTo || paymentStatusFilter !== "all" || customerFilter) && (
            <>
              {dateFrom && <Badge variant="outline">From: {dateFrom}</Badge>}
              {dateTo && <Badge variant="outline">To: {dateTo}</Badge>}
              {amountFrom && <Badge variant="outline">Min: ৳{amountFrom}</Badge>}
              {amountTo && <Badge variant="outline">Max: ৳{amountTo}</Badge>}
              {paymentStatusFilter !== "all" && <Badge variant="outline">Payment: {paymentStatusFilter}</Badge>}
              {customerFilter && <Badge variant="outline">Customer: {customerFilter}</Badge>}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAdvancedFilters}
                className="text-xs h-6 px-2"
              >
                Clear all filters
              </Button>
            </>
          )}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="75">75</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Manage all customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {(dateFrom || dateTo || amountFrom || amountTo || paymentStatusFilter !== "all" || customerFilter) && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Active
                  </Badge>
                )}
              </Button>

              {/* Bulk Actions */}
              {selectedOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedOrders.length} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkPrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span> ({selectedOrders.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkSMS}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">SMS</span> ({selectedOrders.length})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span> ({selectedOrders.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrders([])}
                    className="text-muted-foreground"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date From</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date To</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount From</label>
                    <Input
                      type="number"
                      placeholder="Min amount"
                      value={amountFrom}
                      onChange={(e) => setAmountFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount To</label>
                    <Input
                      type="number"
                      placeholder="Max amount"
                      value={amountTo}
                      onChange={(e) => setAmountTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment Status</label>
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                      <option value="cod">Cash on Delivery</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer</label>
                    <Input
                      placeholder="Name, email, phone"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={clearAdvancedFilters} className="w-full sm:w-auto">
                    Clear Filters
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(false)} className="w-full sm:w-auto">
                    Hide Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
              <TabsTrigger value="processing" className="text-xs sm:text-sm">Processing</TabsTrigger>
              <TabsTrigger value="shipped" className="text-xs sm:text-sm">Shipped</TabsTrigger>
              <TabsTrigger value="delivered" className="text-xs sm:text-sm">Delivered</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="rounded-md border overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedOrders.length === orders.length && orders.length > 0}
                            onCheckedChange={handleSelectAllOrders}
                            aria-label="Select all orders"
                          />
                        </TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                              aria-label="Select order"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{order.orderNumber.slice(-6)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customerName || order.customer?.name || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{order.items.length}</TableCell>
                          <TableCell>৳{order.total.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {order.trackingNumber || order.paperflyOrderNumber ? (
                              <div className="text-sm space-y-1">
                                {(order as any).trackingStatus ? (
                                  <Badge variant="default" className={`text-xs ${
                                    (order as any).trackingStatus.toLowerCase().includes('delivered') ? 'bg-green-100 text-green-800' :
                                    (order as any).trackingStatus.toLowerCase().includes('cancel') ? 'bg-red-100 text-red-800' :
                                    (order as any).trackingStatus.toLowerCase().includes('picked') ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {(order as any).trackingStatus}
                                  </Badge>
                                ) : order.status === 'shipped' ? (
                                  <Badge variant="default" className="bg-purple-100 text-purple-800 text-xs">
                                    In Transit
                                  </Badge>
                                ) : order.status === 'delivered' ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                    Delivered
                                  </Badge>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Order
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintInvoice(order)}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                  {orders.map((order) => (
                    <Card key={order.id} className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                              aria-label="Select order"
                            />
                            <div>
                              <div className="font-semibold text-lg">#{order.orderNumber}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintInvoice(order)}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Customer:</span>
                            <div className="text-right">
                              <div className="font-medium">{order.customerName || order.customer?.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{order.customerEmail || order.customer?.email || 'N/A'}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Items:</span>
                            <span className="font-medium">{order.items.length} items</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total:</span>
                            <span className="font-semibold text-lg">৳{order.total.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            {getStatusBadge(order.status)}
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Payment:</span>
                            {getPaymentBadge(order.paymentStatus)}
                          </div>

                          {(order.trackingNumber || order.paperflyOrderNumber) && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <div className="text-sm font-medium mb-1">Tracking Information</div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center justify-between">
                                  <span>Service:</span>
                                  <span className="font-medium">{order.courierService || (order.paperflyOrderNumber ? 'Paperfly' : 'N/A')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Number:</span>
                                  <span className="font-mono text-xs">{order.paperflyOrderNumber || order.trackingNumber}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Status:</span>
                                  {(order as any).trackingStatus ? (
                                    <Badge variant="default" className={`text-xs ${
                                      (order as any).trackingStatus.toLowerCase().includes('delivered') ? 'bg-green-100 text-green-800' :
                                      (order as any).trackingStatus.toLowerCase().includes('cancel') || 
                                      (order as any).trackingStatus.toLowerCase().includes('failed') ||
                                      (order as any).trackingStatus.toLowerCase().includes('returned') ? 'bg-red-100 text-red-800' :
                                      (order as any).trackingStatus.toLowerCase().includes('picked') ||
                                      (order as any).trackingStatus.toLowerCase().includes('assigned') ? 'bg-blue-100 text-blue-800' :
                                      (order as any).trackingStatus.toLowerCase().includes('in transit') ||
                                      (order as any).trackingStatus.toLowerCase().includes('transit') ? 'bg-purple-100 text-purple-800' :
                                      (order as any).trackingStatus.toLowerCase().includes('pending') ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {(order as any).trackingStatus}
                                    </Badge>
                                  ) : order.status === 'shipped' ? (
                                    <Badge variant="default" className="bg-purple-100 text-purple-800 text-xs">
                                      In Transit
                                    </Badge>
                                  ) : order.status === 'delivered' ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                      Delivered
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Pagination className="order-1 sm:order-2">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) handlePageChange(currentPage - 1)
                  }}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {/* First page */}
              {currentPage > 3 && (
                <>
                  <PaginationItem className="hidden sm:block">
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1) }}>
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 4 && <PaginationEllipsis className="hidden sm:block" />}
                </>
              )}

              {/* Page numbers around current page */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                if (pageNum < 1 || pageNum > totalPages) return null

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => { e.preventDefault(); handlePageChange(pageNum) }}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}

              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <PaginationEllipsis />}
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages) }}>
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < totalPages) handlePageChange(currentPage + 1)
                  }}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* View Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        onPrintInvoice={handlePrintInvoice}
        onSendSMS={handleSendInvoiceSMS}
        onTrackDelivery={handleTrackDelivery}
        onEditOrder={handleEditOrder}
        onMarkAsPaid={handleMarkAsPaid}
        sendingSMS={sendingSMS}
      />

      {/* Edit Order Dialog */}
      <OrderEditDialog
        order={selectedOrder}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSaveOrder={handleSaveOrderEdit}
        saving={savingOrder}
      />

      {/* Track Delivery Dialog */}
      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <DialogContent className="max-w-md w-full p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Track Package - {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Package tracking information and delivery status
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Label className="text-gray-800 dark:text-gray-200">Order Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Label className="text-gray-800 dark:text-gray-200">Payment Status</Label>
                  <div className="mt-1">
                    {getPaymentBadge(selectedOrder.paymentStatus)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3 dark:border-gray-700">
                <Label className="text-gray-800 dark:text-gray-200">Delivery Status</Label>
                <div className="mt-1">
                  {selectedOrder.status === 'shipped' ?
                    <Badge variant="default" className="bg-purple-100 text-purple-800">In Transit</Badge> :
                    getStatusBadge(selectedOrder.status)
                  }
                </div>
              </div>

              {selectedOrder.trackingNumber ? (
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <Label className="text-gray-800 dark:text-gray-200">Courier Service</Label>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{selectedOrder.courierService || 'N/A'}</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <Label className="text-gray-800 dark:text-gray-200">Tracking Number</Label>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{selectedOrder.trackingNumber}</p>
                  </div>

                  <div className="border-t pt-3 dark:border-gray-700">

                    {/* Direct links to couriers */}
                    {selectedOrder.courierService && (
                      <div className="space-y-2">
                        {(selectedOrder.courierService?.toLowerCase().includes('paperfly') || selectedOrder.paperflyOrderNumber) && (selectedOrder.trackingNumber || selectedOrder.paperflyOrderNumber) && (
                          <>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => openPaperflyTrackingPage(selectedOrder)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Track on Paperfly
                            </Button>
                          </>
                        )}
                        {selectedOrder.courierService.toLowerCase().includes('steadfast') && selectedOrder.trackingNumber && (
                          <Button variant="outline" size="sm" className="w-full" onClick={openSteadfastPortal}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Track on Steadfast
                          </Button>
                        )}

                        {/* Pathao Tracking Integration */}
                        {selectedOrder.courierService.toLowerCase().includes('pathao') && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Pathao Tracking</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchPathaoTracking}
                                disabled={loadingPathao}
                              >
                                {loadingPathao ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                                {pathaoTracking ? 'Refresh' : 'Load Data'}
                              </Button>
                            </div>

                            {pathaoTracking ? (
                              <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-sm space-y-3 border">
                                {(pathaoTracking.data?.order || pathaoTracking.order) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <div className="text-xs text-muted-foreground">Recipient</div>
                                      <div className="font-medium">{(pathaoTracking.data?.order || pathaoTracking.order).recipient_name}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Status</div>
                                      <div className="font-semibold text-blue-600">
                                        {pathaoTracking.data?.display_status ||
                                         (pathaoTracking.data?.order || pathaoTracking.order)?.transfer_status ||
                                         (pathaoTracking.data?.state || pathaoTracking.state)?.name}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {Array.isArray(pathaoTracking.data?.log || pathaoTracking.log) && (pathaoTracking.data?.log || pathaoTracking.log).length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs text-muted-foreground mb-1">Latest Updates</div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {(pathaoTracking.data?.log || pathaoTracking.log).map((log: any, idx: number) => (
                                        <div key={idx} className="flex gap-2 text-xs border-l-2 border-blue-200 pl-2">
                                          <div className="flex-1">
                                            <div className="font-medium">{log.desc}</div>
                                            <div className="text-muted-foreground">{log.created_at}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-2 bg-slate-50 rounded border">
                                Click "Load Data" to view tracking details
                              </div>
                            )}
                          </div>
                        )}

                        {!selectedOrder.courierService.toLowerCase().includes('paperfly') &&
                          !selectedOrder.courierService.toLowerCase().includes('steadfast') &&
                          !selectedOrder.courierService.toLowerCase().includes('pathao') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => openCourierSearch(selectedOrder.courierService || "", selectedOrder.trackingNumber || "")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Track on {selectedOrder.courierService}
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">N/A</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    This order hasn't been shipped yet or tracking information hasn't been added.
                  </p>
                  {selectedOrder.status === 'pending' && (
                    <p className="text-sm text-amber-600">Order is currently pending. It will be processed soon.</p>
                  )}
                  {selectedOrder.status === 'processing' && (
                    <p className="text-sm text-blue-600">Order is being processed. Tracking details will be updated once shipped.</p>
                  )}
                  {selectedOrder.status === 'confirmed' && (
                    <p className="text-sm text-blue-600">Order is confirmed. Tracking details will be updated once shipped.</p>
                  )}
                  <div className="flex flex-col gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTrackDialog(false);
                        handleEditOrder(selectedOrder);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add Tracking Information
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        // Close this dialog and navigate to delivery page to create a new delivery
                        setShowTrackDialog(false);
                        window.location.href = '/delivery';
                      }}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Create Delivery Record
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.shippingAddress && (
                <div className="border-t pt-4 dark:border-gray-700">
                  <Label className="text-gray-800 dark:text-gray-200">Shipping Address</Label>
                  <div className="text-sm space-y-1 mt-1 text-gray-600 dark:text-gray-300">
                    <p>{selectedOrder.shippingAddress}</p>
                    <p>{selectedOrder.shippingCity}, {selectedOrder.shippingState} {selectedOrder.shippingZipCode}</p>
                    <p>{selectedOrder.shippingCountry}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk SMS Dialog */}
      <Dialog open={showBulkSMSDialog} onOpenChange={setShowBulkSMSDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Bulk SMS</DialogTitle>
            <DialogDescription>
              Send SMS to {selectedOrders.length} selected orders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="smsType">Message Type</Label>
              <Select value={bulkSMSType} onValueChange={(value: any) => setBulkSMSType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select message type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmation">Order Confirmation</SelectItem>
                  <SelectItem value="invoice">Invoice Notification</SelectItem>
                  <SelectItem value="custom">Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="smsMessage">Message</Label>
              <Textarea
                id="smsMessage"
                value={bulkSMSMessage}
                onChange={(e) => setBulkSMSMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
                className="resize-none"
              />
              <div className="text-sm text-muted-foreground mt-2">
                Available placeholders: {"{customerName}"}, {"{orderNumber}"}, {"{total}"}, {"{status}"}, {"{paymentStatus}"}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
              <p className="text-sm text-blue-800">
                {bulkSMSMessage
                  .replace('{customerName}', 'John Doe')
                  .replace('{orderNumber}', 'ORD-001')
                  .replace('{total}', '৳1,500')
                  .replace('{status}', 'CONFIRMED')
                  .replace('{paymentStatus}', 'PAID')
                }
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Important</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• SMS will only be sent to orders with valid phone numbers</li>
                <li>• Each SMS costs approximately ৳0.50</li>
                <li>• Messages will be sent with a 0.5-second delay between each</li>
                <li>• Total estimated cost: ৳{(selectedOrders.length * 0.5).toFixed(2)}</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkSMSDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendBulkSMS}
                disabled={sendingBulkSMS || !bulkSMSMessage.trim()}
              >
                {sendingBulkSMS ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send SMS to {selectedOrders.length} orders
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Orders</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedOrders.length} selected orders? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">Warning</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• This action will permanently delete the selected orders</li>
                <li>• All order history and associated data will be lost</li>
                <li>• Customer records and product inventory will remain intact</li>
                <li>• This action cannot be reversed</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={deletingOrders}
              >
                {deletingOrders ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedOrders.length} Orders
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paperfly Tracking Details Dialog */}
      <Dialog open={showPaperflyDialog} onOpenChange={setShowPaperflyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paperfly Tracking Details</DialogTitle>
            <DialogDescription>
              Detailed tracking information from Paperfly courier
            </DialogDescription>
          </DialogHeader>
          {loadingPaperflyData ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading tracking details...</span>
            </div>
          ) : paperflyTrackingData ? (
            <div className="space-y-6">
              {/* Order Overview */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">ORDER NUMBER</h4>
                  <p className="font-bold text-lg">{paperflyTrackingData.order_number}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">STATUS</h4>
                  <Badge variant={paperflyTrackingData.status === 'Delivered' ? 'default' : 'secondary'}
                    className={paperflyTrackingData.status === 'Delivered' ? 'bg-green-100 text-green-800' : ''}>
                    {paperflyTrackingData.status}
                  </Badge>
                </div>
              </div>

              {/* Package Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Package Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Description:</span>
                    <p>{paperflyTrackingData.package?.package_description || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Weight:</span>
                    <p>{paperflyTrackingData.package?.merchant_provide_weight || 'N/A'} kg</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Package Option:</span>
                    <p className="capitalize">{paperflyTrackingData.package?.package_option || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Merchant Ref:</span>
                    <p>{paperflyTrackingData.package?.merchant_order_ref || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Collectable Amount:</span>
                    <p className="font-semibold">৳{paperflyTrackingData.package?.collectable_amount?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Collected Amount:</span>
                    <p className="font-semibold text-green-600">৳{paperflyTrackingData.package?.collected_amount?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Sender & Receiver */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Sender</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Name:</span> {paperflyTrackingData.sender?.full_name || 'N/A'}</p>
                    <p><span className="font-medium">Phone:</span> {paperflyTrackingData.sender?.phone_number || 'N/A'}</p>
                    <p><span className="font-medium">Location:</span> {paperflyTrackingData.sender?.thana_name || 'N/A'}, {paperflyTrackingData.sender?.district || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Receiver</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Name:</span> {paperflyTrackingData.receiver?.full_name || 'N/A'}</p>
                    <p><span className="font-medium">Phone:</span> {paperflyTrackingData.receiver?.phone_number || 'N/A'}</p>
                    <p><span className="font-medium">Location:</span> {paperflyTrackingData.receiver?.thana_name || 'N/A'}, {paperflyTrackingData.receiver?.district || 'N/A'}</p>
                    <p><span className="font-medium">Address:</span> {paperflyTrackingData.receiver?.address_line || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Tracking Timeline</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {paperflyTrackingData.timeline?.map((event: any, index: number) => (
                    <div key={index} className="flex gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full mt-1 ${index === 0 ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date_time).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => openPaperflyMerchantTracking(String(paperflyTrackingData.order_number || ""))}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Paperfly
                </Button>
                <Button variant="outline" onClick={() => setShowPaperflyDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">N/A</h3>
              <p className="text-gray-600">
                Unable to retrieve tracking information for this order number.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
