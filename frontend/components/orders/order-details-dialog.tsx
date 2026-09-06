"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronDown, 
  ChevronRight, 
  User, 
  MapPin, 
  ShoppingBag, 
  Printer, 
  DollarSign, 
  MessageSquare, 
  Truck, 
  Edit,
  Loader2 
} from "lucide-react"
import { Order } from "@/lib/orders-service"
import { deliveryService, Delivery } from "@/lib/delivery-service"
import { useToast } from "@/hooks/use-toast"

interface OrderDetailsDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrintInvoice: (order: Order) => void
  onSendSMS: (order: Order) => void
  onTrackDelivery: (order: Order) => void
  onEditOrder: (order: Order) => void
  onMarkAsPaid: (order: Order) => void
  sendingSMS: boolean
}

interface ExpandedSections {
  customer: boolean
  products: boolean
  shipping: boolean
}

export default function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  onPrintInvoice,
  onSendSMS,
  onTrackDelivery,
  onEditOrder,
  onMarkAsPaid,
  sendingSMS
}: OrderDetailsDialogProps) {
  const { toast } = useToast()
  
  // State for delivery data
  const [deliveryData, setDeliveryData] = useState<Delivery | null>(null)
  const [loadingDelivery, setLoadingDelivery] = useState(false)

  // Pathao tracking state
  const [pathaoTracking, setPathaoTracking] = useState<any>(null)
  const [loadingPathao, setLoadingPathao] = useState(false)
  
  // Helper function for currency formatting
  const formatCurrency = (amount: number): string => {
    const rounded = Math.round(amount * 100) / 100
    return rounded.toLocaleString()
  }
  
  // State for collapsible sections - collapsed by default
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    customer: false,
    products: false,
    shipping: false
  })

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setDeliveryData(null)
      setPathaoTracking(null)
      setLoadingDelivery(false)
      setLoadingPathao(false)
    }
  }, [open])

  // Manual function to fetch delivery data - only called when user clicks button
  const fetchDeliveryData = async () => {
    if (!order?.id) return
    
    setLoadingDelivery(true)
    try {
      const delivery = await deliveryService.getDeliveryByOrderId(order.id)
      setDeliveryData(delivery)
      
      toast({
        title: "Success",
        description: "Delivery data loaded successfully",
      })
    } catch (error) {
      console.error('Failed to fetch delivery data:', error)
      setDeliveryData(null)
      toast({
        title: "Error",
        description: "Failed to load delivery data",
        variant: "destructive"
      })
    } finally {
      setLoadingDelivery(false)
    }
  }

  // Manual function to fetch Pathao tracking - only called when user clicks button
  const fetchPathaoTracking = async () => {
    if (!order) return
    
    const trackingNumber = (deliveryData?.trackingNumber || order.trackingNumber) ?? '';
    const phone = (order.customerPhone || deliveryData?.customerPhone) ?? '';
    
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

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
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

  if (!order) return null
 return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] mx-2 sm:mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b dark:border-gray-700 flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Order Details - {order.orderNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm">
            Complete order information and tracking details
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row min-h-0 flex-1 overflow-hidden">
          {/* Left Sidebar - Collapsible sections */}
          <div className="w-full lg:w-80 xl:w-96 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto flex-shrink-0 lg:max-h-full">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              
              {/* Customer Information Section */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                <button
                  onClick={() => toggleSection('customer')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Customer Info</span>
                  </div>
                  {expandedSections.customer ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {expandedSections.customer && (
                  <div className="px-4 pb-4 border-t dark:border-gray-700">
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                        <p className="text-gray-600 dark:text-gray-400">{order.customerName || order.customer?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                        <p className="text-gray-600 dark:text-gray-400">{order.customerPhone || order.customer?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                        <p className="text-gray-600 dark:text-gray-400">{order.customerEmail || order.customer?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Section */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                <button
                  onClick={() => toggleSection('products')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Products ({order.items.length})
                    </span>
                  </div>
                  {expandedSections.products ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {expandedSections.products && (
                  <div className="px-4 pb-4 border-t dark:border-gray-700">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {order.items.map((item, index) => (
                        <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.productName}</h4>
                              {item.productSku && (
                                <p className="text-xs text-gray-500">SKU: {item.productSku}</p>
                              )}
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                ৳{formatCurrency(item.unitPrice)} × {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                ৳{formatCurrency(item.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Information Section */}
              {(order.shippingAddress || order.trackingNumber || order.courierService || order.shippingAmount > 0 || deliveryData) && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                  <button
                    onClick={() => toggleSection('shipping')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">Delivery Info</span>
                    </div>
                    {expandedSections.shipping ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedSections.shipping && (
                    <div className="px-4 pb-4 border-t dark:border-gray-700">
                      <div className="space-y-3 text-sm">
                        {(order.shippingAddress || deliveryData?.deliveryAddress) && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Address:</span>
                            <p className="text-gray-600 dark:text-gray-400">
                              {deliveryData?.deliveryAddress || order.shippingAddress}
                            </p>
                            {((order.shippingCity || order.shippingState || order.shippingZipCode) || 
                              (deliveryData?.deliveryCity || deliveryData?.deliveryState || deliveryData?.deliveryZipCode)) && (
                              <p className="text-gray-600 dark:text-gray-400">
                                {[
                                  deliveryData?.deliveryCity || order.shippingCity, 
                                  deliveryData?.deliveryState || order.shippingState, 
                                  deliveryData?.deliveryZipCode || order.shippingZipCode
                                ].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                        {(order.courierService || deliveryData?.courierService) && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Courier:</span>
                            <p className="text-gray-600 dark:text-gray-400">
                              {deliveryData?.courierService || order.courierService}
                            </p>
                          </div>
                        )}
                        {(order.trackingNumber || deliveryData?.trackingNumber) && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Tracking:</span>
                            <p className="text-gray-600 dark:text-gray-400 font-mono">
                              {deliveryData?.trackingNumber || order.trackingNumber}
                            </p>
                          </div>
                        )}
                        {(deliveryData?.deliveryFee && deliveryData.deliveryFee > 0) || order.shippingAmount > 0 ? (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Delivery Cost:</span>
                            <p className="text-gray-600 dark:text-gray-400">
                              {deliveryData?.deliveryFee ? 
                                `৳${formatCurrency(Number(deliveryData.deliveryFee))}` : 
                                `৳${formatCurrency(order.shippingAmount)}`
                              }
                              {loadingDelivery && <Loader2 className="inline w-3 h-3 ml-2 animate-spin" />}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Delivery Cost:</span>
                            <p className="text-gray-600 dark:text-gray-400">
                              FREE
                              {loadingDelivery && <Loader2 className="inline w-3 h-3 ml-2 animate-spin" />}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
            {/* Order Status and Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Order Status</h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {getStatusBadge(order.status)}
                  <span className="text-xs sm:text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Payment Status</h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {getPaymentBadge(order.paymentStatus)}
                  {order.paymentMethod && (
                    <span className="text-xs sm:text-sm text-gray-500 capitalize">
                      via {order.paymentMethod.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Order Total</h4>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ৳{formatCurrency(order.total + (deliveryData?.deliveryFee ? Number(deliveryData.deliveryFee) - order.shippingAmount : 0))}
                </div>
                {deliveryData?.deliveryFee && Number(deliveryData.deliveryFee) !== order.shippingAmount && (
                  <div className="text-xs text-gray-500 mt-1">
                    Includes delivery: ৳{formatCurrency(Number(deliveryData.deliveryFee))}
                  </div>
                )}
              </div>
            </div>

            {/* Pathao Tracking Details */}
            {(deliveryData?.courierService?.toLowerCase() === 'pathao' || order.courierService?.toLowerCase() === 'pathao') && (
              <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h3 className="font-semibold text-base sm:text-lg text-blue-700 dark:text-blue-200 flex items-center gap-2">
                    <Truck className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" /> Pathao Tracking Details
                    {loadingPathao && <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 ml-2 animate-spin" />}
                  </h3>
                  <div className="flex gap-2">
                    {!pathaoTracking && !loadingPathao && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchPathaoTracking}
                        disabled={loadingPathao}
                        className="text-xs sm:text-sm"
                      >
                        <Truck className="w-3 sm:w-4 h-3 sm:h-4 mr-2" />
                        Load Data
                      </Button>
                    )}
                    {pathaoTracking && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchPathaoTracking}
                        disabled={loadingPathao}
                        className="text-xs sm:text-sm"
                      >
                        <Loader2 className={`w-3 sm:w-4 h-3 sm:h-4 mr-2 ${loadingPathao ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    )}
                  </div>
                </div>
                {pathaoTracking && (pathaoTracking.data || pathaoTracking.order) ? (
                  <div className="space-y-4">
                    {/* Order Info */}
                    {(pathaoTracking.data?.order || pathaoTracking.order) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Recipient</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">{(pathaoTracking.data?.order || pathaoTracking.order).recipient_name}</div>
                          <div className="text-xs text-gray-500">{(pathaoTracking.data?.order || pathaoTracking.order).recipient_phone}</div>
                          <div className="text-xs text-gray-500">{(pathaoTracking.data?.order || pathaoTracking.order).recipient_address}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Merchant</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">{(pathaoTracking.data?.order || pathaoTracking.order).merchant_name}</div>
                          <div className="text-xs text-gray-500">{(pathaoTracking.data?.order || pathaoTracking.order).merchant_address}</div>
                        </div>
                      </div>
                    ) : (
                      <pre className="bg-gray-100 text-xs text-red-600 p-2 rounded overflow-x-auto">
                        {JSON.stringify(pathaoTracking, null, 2)}
                      </pre>
                    )}
                    {/* Current State */}
                    {(pathaoTracking.data?.state || pathaoTracking.state) && (
                      <div className="mt-2">
                        <div className="text-sm text-gray-500">Current State</div>
                        <div className="font-semibold text-blue-700 dark:text-blue-200 text-base sm:text-lg">
                          {pathaoTracking.data?.display_status ||
                           (pathaoTracking.data?.order || pathaoTracking.order)?.transfer_status ||
                           (pathaoTracking.data?.state || pathaoTracking.state).name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated: {(pathaoTracking.data?.order?.transfer_status_updated_at || pathaoTracking.order?.transfer_status_updated_at)}
                        </div>
                        {/* Show raw status if different from display status */}
                        {((pathaoTracking.data?.order || pathaoTracking.order)?.transfer_status &&
                          pathaoTracking.data?.display_status !== (pathaoTracking.data?.order || pathaoTracking.order)?.transfer_status) && (
                          <div className="text-xs text-gray-400 mt-1">
                            Raw Status: {(pathaoTracking.data?.order || pathaoTracking.order).transfer_status}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Tracking Log */}
                    {Array.isArray(pathaoTracking.data?.log || pathaoTracking.log) && (pathaoTracking.data?.log || pathaoTracking.log).length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-gray-500 mb-1">Tracking Log</div>
                        <div className="max-h-40 overflow-y-auto">
                          <ol className="space-y-2">
                            {(pathaoTracking.data?.log || pathaoTracking.log).map((log: any, idx: number) => (
                              <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                                <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">{log.desc}</span>
                                <span className="text-gray-500">{log.created_at}</span>
                                {log.notes && <span className="text-gray-400">{log.notes}</span>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                ) : loadingPathao ? null : (
                  <div className="text-gray-500 text-sm">No tracking data found for this Pathao order.</div>
                )}
              </div>
            )}
            {/* Products Information */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-4">Order Items ({order.items.length} products)</h3>
              
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.productName}</h4>
                        {item.productSku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.productSku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          ৳{formatCurrency(item.total)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                      <span>৳{formatCurrency(item.unitPrice)} × {item.quantity}</span>
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Product</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Quantity</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Unit Price</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-4 px-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{item.productName}</div>
                            {item.productSku && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.productSku}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right text-gray-600 dark:text-gray-300">
                          ৳{formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-4 px-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                          ৳{formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-4">Financial Summary</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Order Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">Order Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium">৳{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-৳{formatCurrency(order.discountAmount)}</span>
                      </div>
                    )}
                    {order.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="font-medium">৳{formatCurrency(order.taxAmount)}</span>
                      </div>
                    )}
                    {((deliveryData?.deliveryFee && deliveryData.deliveryFee > 0) || order.shippingAmount > 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                          <span className="font-medium">
                            ৳{deliveryData?.deliveryFee ? 
                              formatCurrency(Number(deliveryData.deliveryFee)) : 
                              formatCurrency(order.shippingAmount)
                            }
                            {loadingDelivery && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between font-semibold text-base sm:text-lg border-t pt-2 dark:border-gray-600">
                      <span>Total:</span>
                      <span>৳{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">Payment Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                      <span className="font-medium text-green-600">৳{formatCurrency(order.paidAmount || 0)}</span>
                    </div>
                    
                    <div className={`flex justify-between font-semibold ${
                      (order.total - (order.paidAmount || 0)) > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      <span>Due Amount:</span>
                      <span>৳{formatCurrency(Math.max(0, order.total - (order.paidAmount || 0)))}</span>
                    </div>

                    {/* Payment Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Payment Progress</span>
                        <span>{Math.round(((order.paidAmount || 0) / order.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, ((order.paidAmount || 0) / order.total) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 sm:mb-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Notes</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{order.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => onPrintInvoice(order)} variant="outline" className="flex-1 min-w-[150px] order-1">
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
              
              {/* Quick Payment Actions */}
              {order.paymentStatus !== 'paid' && (
                <Button 
                  onClick={() => onMarkAsPaid(order)}
                  variant="default"
                  className="flex-1 min-w-[150px] bg-green-600 hover:bg-green-700 order-2"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              
              {order.customerPhone && (
                <Button 
                  onClick={() => onSendSMS(order)} 
                  variant="outline"
                  disabled={sendingSMS}
                  className="flex-1 min-w-[150px] order-3"
                >
                  {sendingSMS ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  {sendingSMS ? 'Sending...' : 'Send SMS'}
                </Button>
              )}
              
              {order.trackingNumber && (
                <Button 
                  onClick={() => onTrackDelivery(order)} 
                  variant="outline"
                  className="flex-1 min-w-[150px] order-4"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Track Delivery
                </Button>
              )}
              
              <Button 
                onClick={() => {
                  onOpenChange(false)
                  onEditOrder(order)
                }}
                variant="outline"
                className="flex-1 min-w-[150px] order-5"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Order
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}