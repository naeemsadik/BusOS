"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Plus, Minus, Trash2, ShoppingCart, AlertCircle, Loader2, AudioLines, ReceiptText } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CustomerDetails, DeliveryOptions } from "@/components/pos"
import { OrderDetails } from "@/components/pos/types"
import { inventoryService, Product } from "@/lib/inventory-service"
import { posService, CreateSaleData, PosItem } from "@/lib/pos-service"
import { customersService, Customer } from "@/lib/customers-service"
import { deliveryService, CreateDeliveryData } from "@/lib/delivery-service"
import { ordersService, CreateOrderData, UpdateOrderData } from "@/lib/orders-service"
import { useToast } from "@/hooks/use-toast"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"
import { useCurrency } from "@/contexts/currency-context"
import { VoiceCommandDialog } from "@/components/voice/voice-command-dialog"
import type { VoiceCommandResult } from "@/lib/voice-service"
import { invoicesService } from "@/lib/invoices-service"

interface CartItem extends Product {
  quantity: number
}

export default function POSPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.POS}>
      <POSPageContent />
    </PermissionGuardPage>
  )
}

function POSPageContent() {
  const { formatCurrency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    customerName: "",
    customerPhone: "",
    deliveryType: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZipCode: "",
    paymentMethod: "",
    mobileProvider: "",
    cardType: "",
    transactionId: "",
    notes: "",
    discountType: "",
    discountValue: 0,
    deliveryFee: 0,
    paidAmount: 0
  })
  const [errors, setErrors] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [voiceInvoiceReady, setVoiceInvoiceReady] = useState(false)
  const { toast } = useToast()

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [productsResponse, customersResponse] = await Promise.all([
          inventoryService.getProducts(),
          customersService.getCustomers()
        ])
        setProducts(productsResponse.data)
        setCustomers(customersResponse.customers)
      } catch {
        toast({
          title: "Error",
          description: "Failed to load products and customers. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const filteredProducts = products.filter(
    (product) => 
      product.status === 'active' &&
      product.price > 0 &&
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (product.barcode && product.barcode.includes(searchTerm)) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const addToCart = (product: Product) => {
    // Validate product data before adding to cart
    if (!product.price || isNaN(Number(product.price)) || Number(product.price) < 0) {
      toast({
        title: "Error",
        description: `Cannot add ${product.name} to cart. Invalid price.`,
        variant: "destructive"
      })
      return
    }

    if (product.stock <= 0) {
      toast({
        title: "Error",
        description: `${product.name} is out of stock.`,
        variant: "destructive"
      })
      return
    }

    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: "Error",
          description: `Cannot add more ${product.name}. Only ${product.stock} available.`,
          variant: "destructive"
        })
        return
      }
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.id !== id))
    } else {
      const product = products.find(p => p.id === id)
      if (product && quantity > product.stock) {
        toast({
          title: "Error",
          description: `Cannot set quantity to ${quantity}. Only ${product.stock} available for ${product.name}.`,
          variant: "destructive"
        })
        return
      }
      setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)))
    }
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  const handleVoicePosCommand = async (result: VoiceCommandResult) => {
    if (result.mode !== "pos" || result.action === "unknown") return

    const matchedItems = result.items.filter(
      (item) => item.matched && item.productId,
    )
    if (matchedItems.length === 0) {
      throw new Error("None of the spoken products matched the inventory.")
    }

    const resolvedProducts = await Promise.all(
      matchedItems.map(async (item) => ({
        command: item,
        product:
          products.find((product) => product.id === item.productId) ||
          (await inventoryService.getProduct(item.productId!)),
      })),
    )

    const nextCart = [...cart]
    const stockWarnings: string[] = []
    let appliedProductCount = 0
    for (const { command, product } of resolvedProducts) {
      const existingIndex = nextCart.findIndex((item) => item.id === product.id)
      const existingQuantity =
        existingIndex >= 0 ? nextCart[existingIndex].quantity : 0
      const requestedQuantity = existingQuantity + command.quantity
      const finalQuantity = Math.min(requestedQuantity, product.stock)

      if (finalQuantity <= 0) {
        stockWarnings.push(`${product.name} is out of stock`)
        continue
      }
      if (finalQuantity < requestedQuantity) {
        stockWarnings.push(
          `${product.name} was limited to ${product.stock} in stock`,
        )
      }

      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: finalQuantity,
        }
      } else {
        nextCart.push({ ...product, quantity: finalQuantity })
      }
      appliedProductCount += 1
    }

    setCart(nextCart)
    setProducts((currentProducts) => {
      const additions = resolvedProducts
        .map(({ product }) => product)
        .filter(
          (product) =>
            !currentProducts.some((current) => current.id === product.id),
        )
      return [...currentProducts, ...additions]
    })

    const matchingCustomer = customers.find(
      (customer) =>
        (result.customerPhone && customer.phone === result.customerPhone) ||
        (result.customerName &&
          customer.name.toLocaleLowerCase() ===
            result.customerName.toLocaleLowerCase()),
    )
    let nextOrderDetails: OrderDetails = {
      ...orderDetails,
      ...(result.customerName && { customerName: result.customerName }),
      ...(result.customerPhone && { customerPhone: result.customerPhone }),
      ...(result.paymentMethod && { paymentMethod: result.paymentMethod }),
      ...(result.deliveryType && { deliveryType: result.deliveryType }),
    }
    if (matchingCustomer) {
      setSelectedCustomer(matchingCustomer)
      nextOrderDetails = {
        ...nextOrderDetails,
        customerName: matchingCustomer.name,
        customerPhone: matchingCustomer.phone || "",
        customerEmail: matchingCustomer.email || "",
        deliveryAddress: matchingCustomer.address || "",
        deliveryCity: matchingCustomer.city || "",
        deliveryState: matchingCustomer.state || "",
        deliveryZipCode: matchingCustomer.zipCode || "",
      }
    } else {
      setSelectedCustomer(null)
    }
    if (nextOrderDetails.deliveryType === "pickup") {
      const voiceSubtotal = nextCart.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      )
      nextOrderDetails = { ...nextOrderDetails, paidAmount: voiceSubtotal }
    }
    setOrderDetails(nextOrderDetails)

    setVoiceInvoiceReady(result.generateInvoice)
    setErrors([])
    toast({
      title: "Voice command applied",
      description:
        stockWarnings.length > 0
          ? stockWarnings.join(". ")
          : `${appliedProductCount} product${appliedProductCount === 1 ? "" : "s"} added to the cart.`,
      variant: stockWarnings.length > 0 ? "destructive" : "default",
    })

    window.setTimeout(() => {
      document
        .getElementById(result.generateInvoice ? "voice-invoice-review" : "mobile-checkout")
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)

    if (!result.generateInvoice) {
      return appliedProductCount > 0
        ? `${appliedProductCount} product${appliedProductCount === 1 ? " was" : "s were"} added to the point of sale cart.${stockWarnings.length > 0 ? ` ${stockWarnings.join(". ")}.` : ""}`
        : `No products were added. ${stockWarnings.join(". ")}.`
    }

    const validationErrors = validateOrder(nextCart, nextOrderDetails)
    if (!matchingCustomer && !nextOrderDetails.customerName.trim()) {
      validationErrors.push("Customer name is required.")
    }
    if (!matchingCustomer && !nextOrderDetails.customerPhone.trim()) {
      validationErrors.push("Customer phone is required.")
    }
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setVoiceInvoiceReady(true)
      return `The products are in the cart, but the invoice needs review. ${validationErrors.join(" ")}`
    }

    return completeOrder(true, {
      cart: nextCart,
      orderDetails: nextOrderDetails,
      selectedCustomer: matchingCustomer || null,
    })
  }

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setOrderDetails(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      deliveryAddress: customer.address || "",
      deliveryCity: customer.city || "",
      deliveryState: customer.state || "",
      deliveryZipCode: customer.zipCode || ""
    }))
    // Clear errors when customer is selected
    setErrors([])
  }
  
  // Function to check if the customer already exists by phone or email
  const checkExistingCustomer = (phone: string, email?: string): Customer | undefined => {
    return customers.find(
      c => (phone && c.phone === phone) || (email && email.length > 0 && c.email === email)
    )
  }

  const updateOrderDetails = (updates: Partial<OrderDetails>) => {
    setOrderDetails(prev => ({ ...prev, ...updates }))
  }

  const clearErrors = () => {
    setErrors([])
  }

  const validateOrder = (
    candidateCart: CartItem[] = cart,
    candidateOrderDetails: OrderDetails = orderDetails,
  ): string[] => {
    const validationErrors: string[] = []
    
    if (candidateCart.length === 0) {
      validationErrors.push("Cart is empty. Add products to continue.")
    }
    
    
    
    if (!candidateOrderDetails.deliveryType) {
      validationErrors.push("Please select delivery type.")
    }
    
    if (candidateOrderDetails.deliveryType === "delivery" && !candidateOrderDetails.deliveryAddress.trim()) {
      // If Pathao is selected, deliveryAddress can be auto-filled from Pathao selections
      if (candidateOrderDetails.courierService !== 'pathao') {
        validationErrors.push("Delivery address is required for delivery orders.")
      }
    }
    
    if (candidateOrderDetails.deliveryType === "delivery" && !candidateOrderDetails.deliveryCity?.trim()) {
      // If using Pathao, city may be selected via Pathao fields
      if (candidateOrderDetails.courierService !== 'pathao') {
        validationErrors.push("City is required for delivery orders.")
      }
    }
    
    if (!candidateOrderDetails.paymentMethod) {
      validationErrors.push("Please select payment method.")
    }
    
    if ((candidateOrderDetails.paymentMethod === "card" || candidateOrderDetails.paymentMethod === "mobile") && !candidateOrderDetails.transactionId.trim()) {
      validationErrors.push("Transaction ID is required for card and mobile payments.")
    }
    
    if (candidateOrderDetails.paymentMethod === "mobile" && !candidateOrderDetails.mobileProvider) {
      validationErrors.push("Please select a mobile banking provider.")
    }
    
    if (candidateOrderDetails.paymentMethod === "card" && !candidateOrderDetails.cardType) {
      validationErrors.push("Please select a card type.")
    }

    if (candidateOrderDetails.paidAmount < 0) {
      validationErrors.push("Paid amount cannot be negative.")
    }
    
    return validationErrors
  }

  const completeOrder = async (
    generateInvoice = false,
    overrides?: {
      cart: CartItem[]
      orderDetails: OrderDetails
      selectedCustomer: Customer | null
    },
  ): Promise<string | undefined> => {
    const activeCart = overrides?.cart ?? cart
    const activeOrderDetails = overrides?.orderDetails ?? orderDetails
    const activeSelectedCustomer = overrides
      ? overrides.selectedCustomer
      : selectedCustomer
    const activeSubtotal = activeCart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    )
    const activeDiscountAmount =
      activeOrderDetails.discountType === "percentage" && activeOrderDetails.discountValue > 0
        ? activeSubtotal * (Math.min(activeOrderDetails.discountValue, 100) / 100)
        : activeOrderDetails.discountType === "flat" && activeOrderDetails.discountValue > 0
          ? Math.min(activeOrderDetails.discountValue, activeSubtotal)
          : 0
    const activeBaseDeliveryFee =
      activeOrderDetails.deliveryType === "delivery"
        ? activeOrderDetails.deliveryFee
        : 0
    const activeDeliveryFee = activeOrderDetails.waiveDeliveryFee
      ? 0
      : activeBaseDeliveryFee
    const activeTotal =
      activeSubtotal - activeDiscountAmount + activeDeliveryFee
    const validationErrors = validateOrder(activeCart, activeOrderDetails)
    setErrors(validationErrors)
    
    // Check for courier service warning
    const showCourierWarning = activeOrderDetails.deliveryType === "delivery" && !activeOrderDetails.courierService
    
    if (validationErrors.length === 0) {
      // Show warning if no courier service is selected for delivery
      if (showCourierWarning) {
        toast({
          title: "Warning",
          description: "No courier service selected. The order will be processed without automated courier integration.",
          variant: "default"
        })
      }
      
      try {
        setProcessing(true)
        
        // Check if customer already exists by phone or email
        let customerId = activeSelectedCustomer?.id
        if (!customerId) {
          // Try to find an existing customer by phone or email
          const existingCustomer = checkExistingCustomer(
            activeOrderDetails.customerPhone,
            activeOrderDetails.customerEmail
          )
          
          if (existingCustomer) {
            // Use existing customer
            customerId = existingCustomer.id
          } else {
            // Create new customer
            const customerData = {
              name: activeOrderDetails.customerName,
              email: activeOrderDetails.customerEmail || "no-email@example.com",
              phone: activeOrderDetails.customerPhone,
              address: activeOrderDetails.deliveryAddress || undefined
            }
            const newCustomer = await customersService.createCustomer(customerData)
            customerId = newCustomer.id
            
            // Add the new customer to the local state
            setCustomers(prevCustomers => [...prevCustomers, newCustomer])
          }
        }

        // Map frontend payment method to backend expected format
        const mapPaymentMethod = (method: OrderDetails['paymentMethod']): CreateSaleData['paymentMethod'] => {
          switch (method) {
            case "cash":
              return "cash"
            case "cod":
              return "cod" // Now mapped to specific COD payment method
            case "card":
              return "card"
            case "mobile":
              return "mobile_money"
            case "delivery_partner":
              return "cash"
            default:
              return "cash"
          }
        }

        // Prepare sale data
        const saleData: CreateSaleData = {
          customerId,
          customerName: activeOrderDetails.customerName,
          customerEmail: activeOrderDetails.customerEmail || undefined,
          customerPhone: activeOrderDetails.customerPhone,
          // Cart items
          items: activeCart.map(item => ({
            productId: item.id,
            productName: item.name,
            productSku: item.sku || undefined,
            unitPrice: Number(item.price) || 0,
            unitCost: item.cost ? Number(item.cost) : undefined, // Don't send 0, let backend use product cost
            quantity: item.quantity,
            total: (Number(item.price) || 0) * item.quantity
          })),
          subtotal: Number(activeSubtotal.toFixed(2)),
          taxAmount: 0,
          discountAmount: Number(activeDiscountAmount.toFixed(2)),
          shippingAmount: Number(activeDeliveryFee.toFixed(2)),
          total: Number(activeTotal.toFixed(2)),
          paidAmount: Number(activeOrderDetails.paidAmount.toFixed(2)),
          paymentMethod: mapPaymentMethod(activeOrderDetails.paymentMethod),
          notes: activeOrderDetails.notes || undefined,
          paperflyOrderNumber: activeOrderDetails.paperflyOrderNumber || undefined
        }

        // Validate sale data before sending
        const invalidItems = saleData.items.filter(item => 
          isNaN(item.unitPrice) || item.unitPrice < 0 || 
          isNaN(item.quantity) || item.quantity <= 0 ||
          isNaN(item.total) || item.total < 0
        )
        
        if (invalidItems.length > 0) {
          toast({
            title: "Error",
            description: "Some items have invalid prices or quantities. Please check your cart.",
            variant: "destructive"
          })
          throw new Error("Some items have invalid prices or quantities.")
        }

        // Complete the sale
        const completedSale = await posService.createSale(saleData)
        let generatedInvoiceNumber: string | undefined

        if (generateInvoice) {
          try {
            const invoice = await invoicesService.createFromOrder(completedSale.id)
            generatedInvoiceNumber = invoice.invoiceNumber
          } catch (invoiceError) {
            toast({
              title: "Sale completed, invoice not created",
              description: "Create the invoice from the Orders page.",
              variant: "destructive",
            })
          }
        }
        
        // Update the sale/order with shipping details instead of creating a separate order
        try {
          const updateData: any = {};
          
          // Add shipping information if delivery is selected
          if (activeOrderDetails.deliveryType === "delivery") {
            updateData.shippingAddress = activeOrderDetails.deliveryAddress;
            updateData.shippingCity = activeOrderDetails.deliveryCity;
            updateData.shippingState = activeOrderDetails.deliveryState;
            updateData.shippingZipCode = activeOrderDetails.deliveryZipCode;
            updateData.courierService = activeOrderDetails.courierService;
          }

          // Set order status to "delivered" if pickup is selected
          const isPickup = String(activeOrderDetails.deliveryType) === "pickup"
          if (isPickup) {
            updateData.status = "delivered";
          }
          
          // Set payment status to "paid" if full payment is made
          if (activeOrderDetails.paidAmount >= activeTotal) {
            updateData.paymentStatus = "paid";
          }

          // Update the order with shipping and status information
          if (Object.keys(updateData).length > 0) {
            await ordersService.updateOrder(completedSale.id, updateData);
          }
        } catch (orderError) {
          // Don't fail the entire transaction, just log the error
        }
        
        // Sync Paperfly order status if Paperfly order number is provided
        if (activeOrderDetails.paperflyOrderNumber) {
          try {
            const { paperflySyncService } = await import("@/lib/paperfly-sync-service");
            await paperflySyncService.syncOrder(activeOrderDetails.paperflyOrderNumber, completedSale.id, false);
          } catch (syncError) {
            // Don't fail the entire transaction, just log the error
          }
        }
        
        // Create delivery if delivery is selected
        if (activeOrderDetails.deliveryType === "delivery") {
          if (activeOrderDetails.courierService) {
            // Create delivery with courier service
            try {
              const deliveryData: CreateDeliveryData = {
                orderId: completedSale.id,
                customerName: activeOrderDetails.customerName,
                customerPhone: activeOrderDetails.customerPhone,
                deliveryAddress: activeOrderDetails.deliveryAddress,
                deliveryCity: activeOrderDetails.deliveryCity,
                deliveryState: activeOrderDetails.deliveryState,
                deliveryZipCode: activeOrderDetails.deliveryZipCode,
                deliveryType: "standard",
                estimatedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                courierService: `${activeOrderDetails.courierService.charAt(0).toUpperCase() + activeOrderDetails.courierService.slice(1)} Courier`,
                deliveryFee: activeOrderDetails.deliveryFee,
                notes: activeOrderDetails.notes || undefined,
                // Steadfast specific fields
                codAmount: activeOrderDetails.paymentMethod === 'cod' ? activeTotal : 0, // COD amount based on payment method
                alternativePhone: activeOrderDetails.alternativePhone,
                itemDescription: activeOrderDetails.itemDescription || activeCart.map(item => `${item.name} (${item.quantity})`).join(', '),
                totalLot: activeCart.reduce((sum, item) => sum + item.quantity, 0),
                steadfastDeliveryType: activeOrderDetails.steadfastDeliveryType || 0, // Default to home delivery
              }

              if (activeOrderDetails.courierService) {
                const courierPayload: any = {
                  ...deliveryData,
                  courierProvider: activeOrderDetails.courierService as 'steadfast' | 'paperfly' | 'pathao'
                }

                if (activeOrderDetails.courierService === 'pathao') {
                  courierPayload.courierOptions = {
                    store_id: activeOrderDetails.pathaoStoreId,
                    recipient_city: activeOrderDetails.pathaoRecipientCity,
                    recipient_zone: activeOrderDetails.pathaoRecipientZone,
                    recipient_area: activeOrderDetails.pathaoRecipientArea,
                    item_type: activeOrderDetails.pathaoItemType,
                    item_weight: activeOrderDetails.pathaoItemWeight,
                  }
                }

                await deliveryService.createCourierDelivery(courierPayload)
                
                toast({
                  title: "Success", 
                  description: `Sale completed and ${activeOrderDetails.courierService.charAt(0).toUpperCase() + activeOrderDetails.courierService.slice(1)} delivery created successfully!`,
                })
              } else {
                await deliveryService.createDelivery(deliveryData)
                
                toast({
                  title: "Success",
                  description: `Sale completed and ${activeOrderDetails.courierService} delivery created successfully!`,
                })
              }
            } catch (deliveryError) {
              toast({
                title: "Warning",
                description: "Sale completed but failed to create delivery. Please create manually.",
                variant: "destructive"
              })
            }
          } else {
            const isPickup = String(activeOrderDetails.deliveryType) === "pickup"
            toast({
              title: "Success",
              description: isPickup 
                ? "Sale completed successfully! Order marked as delivered for pickup."
                : "Sale completed successfully! Note: No courier service was selected for delivery.",
            })
          }
        } else {
          const isPickup = String(activeOrderDetails.deliveryType) === "pickup"
          toast({
            title: "Success",
            description: isPickup
              ? "Sale completed successfully! Order marked as delivered for pickup."
              : "Sale completed successfully!",
          })
        }

        if (generatedInvoiceNumber) {
          toast({
            title: "Invoice created",
            description: `${generatedInvoiceNumber} was created from the completed sale.`,
          })
        }
        
        // Reset form
        setCart([])
        setVoiceInvoiceReady(false)
        setSelectedCustomer(null)
        setOrderDetails({
          customerName: "",
          customerPhone: "",
          deliveryType: "",
          deliveryAddress: "",
          deliveryCity: "",
          deliveryState: "",
          deliveryZipCode: "",
          paymentMethod: "",
          mobileProvider: "",
          cardType: "",
          transactionId: "",
          notes: "",
          discountType: "",
          discountValue: 0,
          deliveryFee: 0,
          paidAmount: 0
        })
        setErrors([])
        
        // Reload products to update stock
        const updatedProducts = await inventoryService.getProducts()
        setProducts(updatedProducts.data)

        if (generateInvoice) {
          return generatedInvoiceNumber
            ? `Invoice ${generatedInvoiceNumber} was created successfully.`
            : "The sale was completed, but the invoice could not be created. Create it from the Orders page."
        }
        return "The sale was completed successfully."
        
      } catch (completionError: any) {
        toast({
          title: "Error",
          description: "Failed to complete sale. Please try again.",
          variant: "destructive"
        })
        if (overrides) {
          throw new Error(
            completionError.response?.data?.message ||
              completionError.message ||
              "Failed to complete the sale.",
          )
        }
      } finally {
        setProcessing(false)
      }
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  let discountAmount = 0
  if (orderDetails.discountType === "percentage" && orderDetails.discountValue > 0) {
    const percentage = Math.min(orderDetails.discountValue, 100) / 100
    discountAmount = subtotal * percentage
  } else if (orderDetails.discountType === "flat" && orderDetails.discountValue > 0) {
    discountAmount = Math.min(orderDetails.discountValue, subtotal)
  }
  
  const baseDeliveryFee = orderDetails.deliveryType === "delivery" ? orderDetails.deliveryFee : 0
  const deliveryFee = orderDetails.waiveDeliveryFee ? 0 : baseDeliveryFee
  const total = subtotal - discountAmount + deliveryFee

  // Auto-set paid amount to total for full payment when pickup is selected or when total changes
  useEffect(() => {
    const isPickup = String(orderDetails.deliveryType) === "pickup"
    if (isPickup && orderDetails.paidAmount !== total && total > 0) {
      // For pickup orders, automatically set paid amount to total (since payment is taken in store)
      setOrderDetails(prev => ({ ...prev, paidAmount: total }))
    }
  }, [total, orderDetails.deliveryType, orderDetails.paidAmount])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
        <span className="ml-2 text-sm sm:text-base">Loading...</span>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Point of sale</p>
          <p className="text-xs text-muted-foreground">
            Add products normally or prepare a full invoice with a voice command.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setVoiceDialogOpen(true)}
          className="w-full border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 sm:w-auto"
        >
          <AudioLines className="mr-2 h-4 w-4" />
          Voice invoice
        </Button>
      </div>

      {voiceInvoiceReady && (
        <Alert id="voice-invoice-review" className="mb-4 border-emerald-600/30 bg-emerald-500/5">
          <ReceiptText className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              The voice command is applied. Review the cart, customer, payment, and fulfilment details before creating the invoice.
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => completeOrder(true)}
              disabled={processing}
              className="shrink-0"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ReceiptText className="mr-2 h-4 w-4" />
              )}
              Create invoice
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <VoiceCommandDialog
        mode="pos"
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        onApply={handleVoicePosCommand}
      />

      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div className="space-y-4">
          {/* Search Section */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cart.length} items)
                </span>
                {cart.length > 0 && (
                  <span className="text-lg font-bold">{formatCurrency(total)}</span>
                )}
              </CardTitle>
            </CardHeader>
            {cart.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {cart.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{item.name}</span>
                      <span>{item.quantity}x</span>
                    </div>
                  ))}
                  {cart.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{cart.length - 2} more items
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-sm truncate flex-1">{product.name}</h3>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {product.stock} left
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{product.category}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">৳{product.price.toLocaleString()}</span>
                      <Button size="sm" onClick={() => addToCart(product)} className="h-10 w-10 sm:h-8 sm:w-auto">
                        <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Checkout Button */}
          {cart.length > 0 && (
            <div className="sticky bottom-4 z-10">
              <Button 
                className="w-full h-12 text-lg font-semibold" 
                onClick={() => {
                  // Navigate to checkout view
                  const checkoutElement = document.getElementById('mobile-checkout');
                  if (checkoutElement) {
                    checkoutElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Proceed to Checkout ({formatCurrency(total)})
              </Button>
            </div>
          )}

          {/* Mobile Checkout Section */}
          {cart.length > 0 && (
            <div id="mobile-checkout" className="space-y-4">
              {/* Customer Details */}
              <CustomerDetails
                selectedCustomer={selectedCustomer ? {
                  id: selectedCustomer.id,
                  name: selectedCustomer.name,
                  phone: selectedCustomer.phone || "",
                  email: selectedCustomer.email,
                  address: selectedCustomer.address
                } : null}
                orderDetails={orderDetails}
                sampleCustomers={customers.map(customer => ({
                  id: customer.id,
                  name: customer.name,
                  phone: customer.phone || "",
                  email: customer.email,
                  address: customer.address
                }))}
                onSelectCustomer={(customer) => {
                  if (customer === null) {
                    setSelectedCustomer(null)
                    return
                  }
                  const fullCustomer = customers.find(c => c.id === customer.id)
                  if (fullCustomer) {
                    selectCustomer(fullCustomer)
                  }
                }}
                onUpdateOrderDetails={updateOrderDetails}
                onClearErrors={clearErrors}
              />

              {/* Cart Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">৳{item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 sm:h-auto sm:w-auto">
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 sm:h-auto sm:w-auto">
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.id)} className="h-8 w-8 sm:h-auto sm:w-auto">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>৳{subtotal.toLocaleString()}</span>
                    </div>
                    
                    {/* Discount Section */}
                    <div className="pt-2 pb-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="discountType" className="text-sm">Discount:</Label>
                        <select
                          id="discountType"
                          value={orderDetails.discountType}
                          onChange={(e) => updateOrderDetails({ 
                            discountType: e.target.value as "percentage" | "flat" | "",
                            discountValue: 0
                          })}
                          className="text-sm rounded border p-1 flex-1"
                        >
                          <option value="">No Discount</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="flat">Flat Amount</option>
                        </select>
                        
                        {orderDetails.discountType && (
                          <Input
                            type="number"
                            value={orderDetails.discountValue}
                            min={0}
                            max={orderDetails.discountType === "percentage" ? 100 : subtotal}
                            onChange={(e) => updateOrderDetails({ 
                              discountValue: Number(e.target.value) || 0 
                            })}
                            className="w-20 text-sm h-8"
                            placeholder={orderDetails.discountType === "percentage" ? "%" : "৳"}
                          />
                        )}
                      </div>
                      
                      {orderDetails.discountType && orderDetails.discountValue > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>
                            Discount 
                            {orderDetails.discountType === "percentage" ? 
                              ` (${Math.min(orderDetails.discountValue, 100)}%)` : 
                              ""}:
                          </span>
                          <span>-৳{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {baseDeliveryFee > 0 && orderDetails.deliveryType === "delivery" && (
                      <div className="flex justify-between text-sm items-center">
                        <span>
                          Delivery Fee:
                          {orderDetails.waiveDeliveryFee && (
                            <span className="text-green-600 ml-1">(Waived)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={orderDetails.waiveDeliveryFee ? "line-through text-muted-foreground" : ""}>
                            ৳{baseDeliveryFee.toLocaleString()}
                          </span>
                          {orderDetails.pathaoPriceLoading && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                          {orderDetails.waiveDeliveryFee && (
                            <span className="text-green-600 ml-2">৳0</span>
                          )}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>৳{total.toLocaleString()}</span>
                    </div>

                    {/* Paid Amount Section */}
                    <div className="pt-4 pb-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="paidAmount" className="text-sm">Paid:</Label>
                        <Input
                          id="paidAmount"
                          type="number"
                          value={orderDetails.paidAmount || ''}
                          min={0}
                          onChange={(e) => updateOrderDetails({ 
                            paidAmount: Number(e.target.value) || 0 
                          })}
                          className="flex-1 text-sm h-8"
                          placeholder="Enter amount paid"
                        />
                      </div>

                      {orderDetails.paidAmount > 0 && (
                        orderDetails.paidAmount >= total ? (
                          <div className="flex justify-between text-sm text-green-600 font-semibold">
                            <span>Change to Return:</span>
                            <span>৳{(orderDetails.paidAmount - total).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-sm text-amber-600 font-semibold">
                            <span>Amount Due:</span>
                            <span>৳{(total - orderDetails.paidAmount).toFixed(2)}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Delivery Component */}
                    <DeliveryOptions
                      orderDetails={orderDetails}
                      onUpdateOrderDetails={updateOrderDetails}
                      total={total}
                      deliveryFee={baseDeliveryFee}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions..."
                        value={orderDetails.notes}
                        onChange={(e) => updateOrderDetails({ notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {orderDetails.deliveryType === "delivery" && !orderDetails.courierService && (
                    <Alert variant="default" className="border-yellow-500 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Warning:</strong> No courier service selected. You can still complete the order, but it will be processed without automated courier integration.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button className="w-full" size="lg" onClick={() => completeOrder(false)} disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Sale...
                      </>
                    ) : (
                      "Complete Sale"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-6 h-full">
        {/* Products Section */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-sm">{product.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {product.stock} left
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">৳{product.price.toLocaleString()}</span>
                      <Button size="sm" onClick={() => addToCart(product)} className="h-10 w-10 sm:h-8 sm:w-auto">
                        <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          {/* Customer Details Component */}
          <CustomerDetails
            selectedCustomer={selectedCustomer ? {
              id: selectedCustomer.id,
              name: selectedCustomer.name,
              phone: selectedCustomer.phone || "",
              email: selectedCustomer.email,
              address: selectedCustomer.address
            } : null}
            orderDetails={orderDetails}
            sampleCustomers={customers.map(customer => ({
              id: customer.id,
              name: customer.name,
              phone: customer.phone || "",
              email: customer.email,
              address: customer.address
            }))}
            onSelectCustomer={(customer) => {
              if (customer === null) {
                setSelectedCustomer(null)
                return
              }
              const fullCustomer = customers.find(c => c.id === customer.id)
              if (fullCustomer) {
                selectCustomer(fullCustomer)
              }
            }}
            onUpdateOrderDetails={updateOrderDetails}
            onClearErrors={clearErrors}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cart is empty. Add products to start selling.</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">৳{item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 sm:h-auto sm:w-auto">
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 sm:h-auto sm:w-auto">
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.id)} className="h-8 w-8 sm:h-auto sm:w-auto">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>৳{subtotal.toLocaleString()}</span>
                    </div>
                    
                    {/* Discount Section */}
                    <div className="pt-2 pb-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="discountType" className="text-sm">Discount:</Label>
                        <select
                          id="discountType"
                          value={orderDetails.discountType}
                          onChange={(e) => updateOrderDetails({ 
                            discountType: e.target.value as "percentage" | "flat" | "",
                            discountValue: 0
                          })}
                          className="text-sm rounded border p-1"
                        >
                          <option value="">No Discount</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="flat">Flat Amount</option>
                        </select>
                        
                        {orderDetails.discountType && (
                          <Input
                            type="number"
                            value={orderDetails.discountValue}
                            min={0}
                            max={orderDetails.discountType === "percentage" ? 100 : subtotal}
                            onChange={(e) => updateOrderDetails({ 
                              discountValue: Number(e.target.value) || 0 
                            })}
                            className="w-20 text-sm h-8"
                            placeholder={orderDetails.discountType === "percentage" ? "%" : "৳"}
                          />
                        )}
                      </div>
                      
                      {orderDetails.discountType && orderDetails.discountValue > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>
                            Discount 
                            {orderDetails.discountType === "percentage" ? 
                              ` (${Math.min(orderDetails.discountValue, 100)}%)` : 
                              ""}:
                          </span>
                          <span>-৳{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {baseDeliveryFee > 0 && orderDetails.deliveryType === "delivery" && (
                      <div className="flex justify-between text-sm items-center">
                        <span>
                          Delivery Fee:
                          {orderDetails.waiveDeliveryFee && (
                            <span className="text-green-600 ml-1">(Waived)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={orderDetails.waiveDeliveryFee ? "line-through text-muted-foreground" : ""}>
                            ৳{baseDeliveryFee.toLocaleString()}
                          </span>
                          {orderDetails.pathaoPriceLoading && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                          {orderDetails.waiveDeliveryFee && (
                            <span className="text-green-600 ml-2">৳0</span>
                          )}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>৳{total.toLocaleString()}</span>
                    </div>

                    {/* Paid Amount Section */}
                    <div className="pt-4 pb-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="paidAmount" className="text-sm">Paid:</Label>
                        <Input
                          id="paidAmount"
                          type="number"
                          value={orderDetails.paidAmount || ''}
                          min={0}
                          onChange={(e) => updateOrderDetails({ 
                            paidAmount: Number(e.target.value) || 0 
                          })}
                          className="flex-1 text-sm h-8"
                          placeholder="Enter amount paid"
                        />
                      </div>

                      {orderDetails.paidAmount > 0 && (
                        orderDetails.paidAmount >= total ? (
                          <div className="flex justify-between text-sm text-green-600 font-semibold">
                            <span>Change to Return:</span>
                            <span>৳{(orderDetails.paidAmount - total).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-sm text-amber-600 font-semibold">
                            <span>Amount Due:</span>
                            <span>৳{(total - orderDetails.paidAmount).toFixed(2)}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Delivery Component */}
                    <DeliveryOptions
                      orderDetails={orderDetails}
                      onUpdateOrderDetails={updateOrderDetails}
                      total={total}
                      deliveryFee={baseDeliveryFee}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions..."
                        value={orderDetails.notes}
                        onChange={(e) => updateOrderDetails({ notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {orderDetails.deliveryType === "delivery" && !orderDetails.courierService && (
                    <Alert variant="default" className="border-yellow-500 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Warning:</strong> No courier service selected. You can still complete the order, but it will be processed without automated courier integration. You may need to arrange delivery manually.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button className="w-full" size="lg" onClick={() => completeOrder(false)} disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Sale...
                      </>
                    ) : (
                      "Complete Sale"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
