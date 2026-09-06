"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Minus, 
  X, 
  Search, 
  Package, 
  ShoppingCart,
  Calculator,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Order } from "@/lib/orders-service"
import { Product, ProductQuery, inventoryService } from "@/lib/inventory-service"
import { deliveryService, Delivery } from "@/lib/delivery-service"
import { useToast } from "@/hooks/use-toast"

interface OrderEditDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveOrder: (orderData: any) => Promise<void>
  saving: boolean
}

interface OrderItem {
  id?: string
  productId: string
  productName: string
  productSku?: string
  unitPrice: number
  quantity: number
  total: number
}

export default function OrderEditDialog({
  order,
  open,
  onOpenChange,
  onSaveOrder,
  saving
}: OrderEditDialogProps) {
  const { toast } = useToast()
  
  // Delivery data state
  const [deliveryData, setDeliveryData] = useState<Delivery | null>(null)
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  
  // Helper function for currency formatting
  const formatCurrency = (amount: number): string => {
    const rounded = Math.round(amount * 100) / 100
    return rounded.toLocaleString()
  }
  
  // Form states
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [formData, setFormData] = useState({
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    paidAmount: 0,
    trackingNumber: '',
    courierService: '',
    notes: '',
    discountType: 'none' as "percentage" | "flat" | "none",
    discountValue: 0,
    discountAmount: 0,
    taxAmount: 0,
    shippingAmount: 0
  })

  // Product search states
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)

  // Calculate discount amount based on type and value
  const calculateDiscountAmount = (subtotal: number, discountType: string, discountValue: number) => {
    if (discountType === "none" || !discountType || isNaN(subtotal) || isNaN(discountValue)) return 0
    if (discountType === "percentage" && discountValue > 0) {
      const percentage = Math.min(discountValue, 100) / 100
      return subtotal * percentage
    } else if (discountType === "flat" && discountValue > 0) {
      return Math.min(discountValue, subtotal)
    }
    return 0
  }

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => {
    const itemTotal = (item.total && !isNaN(Number(item.total))) ? Number(item.total) : 0
    return sum + itemTotal
  }, 0)
  
  const discountAmount = calculateDiscountAmount(subtotal, formData.discountType, formData.discountValue)
  const taxAmount = (formData.taxAmount && !isNaN(Number(formData.taxAmount))) ? Number(formData.taxAmount) : 0
  const shippingAmount = (formData.shippingAmount && !isNaN(Number(formData.shippingAmount))) ? Number(formData.shippingAmount) : 0
  const total = subtotal - discountAmount + taxAmount + shippingAmount

  // Initialize form data when order changes
  useEffect(() => {
    const initializeOrderData = async () => {
      if (order && open) {
        // First initialize with order data
        let discountType: "percentage" | "flat" | "none" = "none"
        let discountValue = 0
        
        if (order.discountAmount && Number(order.discountAmount) > 0) {
          discountType = "flat"
          discountValue = Number(order.discountAmount)
        }

        const initialFormData = {
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod || '',
          paidAmount: Number(order.paidAmount) || 0,
          trackingNumber: order.trackingNumber || '',
          courierService: order.courierService || '',
          notes: order.notes || '',
          discountType,
          discountValue,
          discountAmount: Number(order.discountAmount) || 0,
          taxAmount: Number(order.taxAmount) || 0,
          shippingAmount: Number(order.shippingAmount) || 0
        }

        setFormData(initialFormData)

        // Convert order items to editable format
        const items: OrderItem[] = order.items.map(item => {
          const unitPrice = (item.unitPrice && !isNaN(Number(item.unitPrice))) ? Number(item.unitPrice) : 0
          const quantity = (item.quantity && !isNaN(Number(item.quantity))) ? Number(item.quantity) : 1
          return {
            id: item.id,
            productId: item.productId || '',
            productName: item.productName || '',
            productSku: item.productSku || '',
            unitPrice: unitPrice,
            quantity: quantity,
            total: unitPrice * quantity // Recalculate total to ensure consistency
          }
        })
        setOrderItems(items)

        // Then fetch delivery data and update form if available
        setLoadingDelivery(true)
        try {
          const delivery = await deliveryService.getDeliveryByOrderId(order.id)
          setDeliveryData(delivery)
          
          if (delivery) {
            // Update form data with delivery information
            setFormData(prev => ({
              ...prev,
              trackingNumber: delivery.trackingNumber || prev.trackingNumber,
              courierService: delivery.courierService || prev.courierService,
              shippingAmount: delivery.deliveryFee ? Number(delivery.deliveryFee) : prev.shippingAmount
            }))
          }
        } catch (error) {
          console.error('Failed to fetch delivery data:', error)
          setDeliveryData(null)
        } finally {
          setLoadingDelivery(false)
        }
      }
    }

    initializeOrderData()
  }, [order, open])

  // Search for products
  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }

    setLoadingProducts(true)
    try {
      const response = await inventoryService.getProducts({
        search: term,
        limit: 10,
        page: 1
      })
      setSearchResults(response.data)
    } catch (error) {
      console.error('Failed to search products:', error)
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive"
      })
    } finally {
      setLoadingProducts(false)
    }
  }

  // Handle search term change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchProducts(searchTerm)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Add product to order
  const addProductToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id)
    
    if (existingItem) {
      // Increase quantity if product already exists
      updateItemQuantity(existingItem.productId, existingItem.quantity + 1)
    } else {
      // Add new item - ensure price is a valid number
      const unitPrice = (product.price && !isNaN(Number(product.price))) ? Number(product.price) : 0
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        productSku: product.sku || undefined,
        unitPrice: unitPrice,
        quantity: 1,
        total: unitPrice * 1
      }
      setOrderItems(prev => [...prev, newItem])
    }

    setSearchTerm("")
    setSearchResults([])
    setShowProductSearch(false)
  }

  // Update item quantity
  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    setOrderItems(prev => prev.map(item => 
      item.productId === productId 
        ? { 
            ...item, 
            quantity: Math.max(1, Number(newQuantity) || 1), 
            total: (item.unitPrice && !isNaN(Number(item.unitPrice))) ? Number(item.unitPrice) * Math.max(1, Number(newQuantity) || 1) : 0
          }
        : item
    ))
  }

  // Update item price
  const updateItemPrice = (productId: string, newPrice: number) => {
    const validPrice = Math.max(0, Number(newPrice) || 0)
    
    setOrderItems(prev => prev.map(item => 
      item.productId === productId 
        ? { 
            ...item, 
            unitPrice: validPrice, 
            total: validPrice * Math.max(1, item.quantity)
          }
        : item
    ))
  }

  // Remove item from order
  const removeItem = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId))
  }

  // Handle form submission
  const handleSave = async () => {
    if (!order || orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Order must have at least one item",
        variant: "destructive"
      })
      return
    }

    const finalTotal = total || 0
    const finalPaidAmount = Math.min(formData.paidAmount || 0, finalTotal)

    // Prepare order data with only the fields that the backend expects
    const orderData = {
      // Order status and payment fields
      status: formData.status,
      paymentStatus: formData.paymentStatus,
      paymentMethod: formData.paymentMethod,
      paidAmount: finalPaidAmount,
      
      // Delivery fields
      trackingNumber: formData.trackingNumber,
      courierService: formData.courierService,
      
      // Order notes
      notes: formData.notes,
      
      // Customer fields from original order
      ...(order.customerId && { customerId: order.customerId }),
      ...(order.customerName && { customerName: order.customerName }),
      ...(order.customerEmail && { customerEmail: order.customerEmail }),
      ...(order.customerPhone && { customerPhone: order.customerPhone }),
      
      // Order items and calculations
      items: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        quantity: Math.max(1, Number(item.quantity) || 1),
        total: Math.max(0, Number(item.total) || 0)
      })),
      subtotal: subtotal || 0,
      taxAmount: formData.taxAmount || 0,
      discountAmount: discountAmount || 0,
      shippingAmount: formData.shippingAmount || 0,
      total: finalTotal
    }

    await onSaveOrder(orderData)
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] mx-2 sm:mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Edit Order - {order.orderNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Modify order details, add or remove products, and update status
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
          {/* Left Section - Order Items */}
          <div className="flex-1 p-6 overflow-y-auto border-r dark:border-gray-700">
            <div className="space-y-6">
              {/* Add Products Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3">
                  Add Products
                </h3>
                
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search products by name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowProductSearch(true)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowProductSearch(!showProductSearch)}
                    >
                      <Package className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Search Results */}
                  {showProductSearch && (searchResults.length > 0 || loadingProducts) && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {loadingProducts ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm">Searching products...</span>
                        </div>
                      ) : (
                        searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                            onClick={() => addProductToOrder(product)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {product.name}
                                </div>
                                {product.sku && (
                                  <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                  ৳{product.price.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Stock: {product.stock}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    Order Items ({orderItems.length})
                  </h3>
                  <Badge variant="outline" className="px-3 py-1">
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    ৳{formatCurrency(subtotal || 0)}
                  </Badge>
                </div>

                {orderItems.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No items in this order</p>
                    <p className="text-sm text-gray-400">Search and add products above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div
                        key={item.productId}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Product Info */}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {item.productName}
                            </h4>
                            {item.productSku && (
                              <p className="text-sm text-gray-500">SKU: {item.productSku}</p>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">৳</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>

                          {/* Total */}
                          <div className="font-semibold text-gray-900 dark:text-gray-100 min-w-[80px] text-right">
                            ৳{formatCurrency(item.total || 0)}
                          </div>

                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.productId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Order Details & Calculations */}
          <div className="w-full lg:w-96 p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
            <div className="space-y-6">
              {/* Order Status */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3">
                  Order Status
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="status">Order Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <Select 
                      value={formData.paymentStatus} 
                      onValueChange={(value) => setFormData({...formData, paymentStatus: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3">
                  Payment Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select 
                      value={formData.paymentMethod} 
                      onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="rocket">Rocket</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paidAmount">Paid Amount (৳)</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      max={total || 0}
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value) || 0})}
                      placeholder="Enter paid amount"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: ৳{formatCurrency(Math.max(0, (total || 0) - formData.paidAmount))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Calculations */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3">
                  <Calculator className="w-5 h-5 inline mr-2" />
                  Order Calculations
                </h3>
                <div className="space-y-4">
                  {/* Discount Section */}
                  <div>
                    <Label htmlFor="discountType">Discount</Label>
                    <div className="flex gap-2 mb-2">
                      <Select
                        value={formData.discountType}
                        onValueChange={(value: "percentage" | "flat" | "none") => 
                          setFormData({
                            ...formData, 
                            discountType: value,
                            discountValue: 0
                          })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="No Discount" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Discount</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="flat">Flat Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {formData.discountType && formData.discountType !== "none" && (
                        <Input
                          type="number"
                          value={formData.discountValue}
                          min={0}
                          max={formData.discountType === "percentage" ? 100 : subtotal}
                          onChange={(e) => setFormData({
                            ...formData,
                            discountValue: Number(e.target.value) || 0
                          })}
                          className="w-24"
                          placeholder={formData.discountType === "percentage" ? "%" : "৳"}
                        />
                      )}
                    </div>
                    
                    {formData.discountType && formData.discountValue > 0 && (
                      <p className="text-sm text-green-600">
                        Discount: -৳{formatCurrency(discountAmount || 0)}
                        {formData.discountType === "percentage" && 
                          ` (${Math.min(formData.discountValue, 100)}%)`
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="taxAmount">Tax Amount (৳)</Label>
                    <Input
                      id="taxAmount"
                      type="number"
                      min="0"
                      value={formData.taxAmount}
                      onChange={(e) => setFormData({...formData, taxAmount: Number(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="shippingAmount">
                      Delivery Amount (৳)
                      {loadingDelivery && <Loader2 className="inline w-3 h-3 ml-2 animate-spin" />}
                    </Label>
                    <Input
                      id="shippingAmount"
                      type="number"
                      min="0"
                      value={formData.shippingAmount}
                      onChange={(e) => setFormData({...formData, shippingAmount: Number(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                    {deliveryData?.deliveryFee && Number(deliveryData.deliveryFee) !== formData.shippingAmount && (
                      <p className="text-xs text-blue-600 mt-1">
                        Courier delivery fee: ৳{formatCurrency(Number(deliveryData.deliveryFee))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({...formData, shippingAmount: Number(deliveryData.deliveryFee)})}
                          className="text-xs p-1 h-auto ml-2"
                        >
                          Use this
                        </Button>
                      </p>
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span>৳{formatCurrency(subtotal || 0)}</span>
                    </div>
                    {(discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          Discount
                          {formData.discountType === "percentage" ? 
                            ` (${Math.min(formData.discountValue, 100)}%)` : 
                            ""}:
                        </span>
                        <span>-৳{formatCurrency(discountAmount || 0)}</span>
                      </div>
                    )}
                    {(formData.taxAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        <span>৳{formatCurrency(formData.taxAmount || 0)}</span>
                      </div>
                    )}
                    {(formData.shippingAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                        <span>৳{formatCurrency(formData.shippingAmount || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2 dark:border-gray-600">
                      <span>Total:</span>
                      <span>৳{formatCurrency(total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3">
                  Delivery Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="courierService">Courier Service</Label>
                    <Input
                      id="courierService"
                      value={formData.courierService}
                      onChange={(e) => setFormData({...formData, courierService: e.target.value})}
                      placeholder="e.g., Paperfly, Steadfast, DHL"
                    />
                  </div>

                  <div>
                    <Label htmlFor="trackingNumber">Tracking Number</Label>
                    <Input
                      id="trackingNumber"
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                      placeholder="Enter tracking number"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Add any notes about this order"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t dark:border-gray-700">
                {(total || 0) !== (order.total || 0) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">
                        Order total has changed: ৳{(order.total || 0).toLocaleString()} → ৳{(total || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving || orderItems.length === 0}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
