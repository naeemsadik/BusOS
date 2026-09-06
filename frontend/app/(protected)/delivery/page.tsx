"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Search,
  Plus,
  MoreHorizontal,
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  RefreshCw,
  Phone,
  Settings,
  Loader2,
} from "lucide-react"
import { deliveryService, Delivery, CreateDeliveryData } from "@/lib/delivery-service"
import { paperflySyncService } from "@/lib/paperfly-sync-service"
import { useToast } from "@/hooks/use-toast"
import { ordersService } from "@/lib/orders-service"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"

export default function DeliveryPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.DELIVERY}>
      <DeliveryPageContent />
    </PermissionGuardPage>
  )
}

function DeliveryPageContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false)
  const [courierProviders, setCourierProviders] = useState<Array<'steadfast' | 'paperfly' | 'pathao'>>([])
  const [courierAvailable, setCourierAvailable] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [pathaoCities, setPathaoCities] = useState<any[]>([])
  const [pathaoZones, setPathaoZones] = useState<any[]>([])
  const [pathaoAreas, setPathaoAreas] = useState<any[]>([])
  const [pathaoStores, setPathaoStores] = useState<any[]>([])
  const { toast } = useToast()

  const [newDelivery, setNewDelivery] = useState<CreateDeliveryData>({
    orderId: "",
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZipCode: "",
    deliveryType: "standard",
    estimatedDeliveryDate: new Date().toISOString().split('T')[0],
    courierService: "",
    deliveryFee: 0,
    notes: "",
    deliveryInstructions: "",
    courierProvider: undefined,
    courierOptions: {
      item_description: "General Item",
      item_quantity: 1,
      item_weight: 0.5,
      delivery_type: 48,
    },
  })

  // Fetch Pathao data when provider is selected
  useEffect(() => {
    if (newDelivery.courierProvider === 'pathao') {
      if (pathaoCities.length === 0) {
        deliveryService.getPathaoCities()
          .then(cities => setPathaoCities(cities))
          .catch(err => console.error('Failed to fetch Pathao cities:', err))
      }
      if (pathaoStores.length === 0) {
        deliveryService.getPathaoStores()
          .then(stores => {
            setPathaoStores(stores)
            // Auto-select if only one store
            if (stores.length === 1) {
              setNewDelivery(prev => ({
                ...prev,
                courierOptions: {
                  ...prev.courierOptions,
                  store_id: stores[0].store_id
                }
              }))
            }
          })
          .catch(err => console.error('Failed to fetch Pathao stores:', err))
      }
    }
  }, [newDelivery.courierProvider, pathaoCities.length, pathaoStores.length])

  // Load deliveries data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [deliveriesResponse, ordersResponse, courierResponse] = await Promise.all([
          deliveryService.getDeliveries(),
          ordersService.getOrders({ limit: 100 }),
          deliveryService.getAvailableCourierProviders()
        ])

        setDeliveries(deliveriesResponse.deliveries)
        setOrders(ordersResponse.orders)
        setCourierProviders(courierResponse.providers)
        setCourierAvailable(courierResponse.providers.length > 0)
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  // Initialize Paperfly auto-sync for delivery page as well
  useEffect(() => {
    // Start auto-sync every 5 minutes if not already running
    if (!paperflySyncService.isAutoSyncActive()) {
      paperflySyncService.startAutoSync(5)
    }
  }, [])

  const handleCreateDelivery = async () => {
    if (!newDelivery.orderId || !newDelivery.customerName || !newDelivery.deliveryAddress) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      let response
      let payload = { ...newDelivery }

      // Construct full address for Pathao
      if (newDelivery.courierProvider === 'pathao' && newDelivery.courierOptions) {
        const cityId = newDelivery.courierOptions.recipient_city
        const zoneId = newDelivery.courierOptions.recipient_zone
        const areaId = newDelivery.courierOptions.recipient_area

        const city = pathaoCities.find(c => c.city_id == cityId)?.city_name
        const zone = pathaoZones.find(z => z.zone_id == zoneId)?.zone_name
        const area = pathaoAreas.find(a => a.area_id == areaId)?.area_name

        // Strict concatenation: Street Address + Area + Zone + City
        const addressParts = [newDelivery.deliveryAddress.trim()]
        if (area) addressParts.push(area)
        if (zone) addressParts.push(zone)
        if (city) addressParts.push(city)

        payload.deliveryAddress = addressParts.join(', ')
      }

      if (payload.courierProvider && courierAvailable) {
        response = await deliveryService.createCourierDelivery(payload)
      } else {
        response = await deliveryService.createDelivery(payload)
      }

      setDeliveries(prev => [response, ...prev])
      setShowNewDeliveryDialog(false)
      setNewDelivery({
        orderId: "",
        customerName: "",
        customerPhone: "",
        deliveryAddress: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryZipCode: "",
        deliveryType: "standard",
        estimatedDeliveryDate: new Date().toISOString().split('T')[0],
        courierService: "",
        deliveryFee: 0,
        notes: "",
        deliveryInstructions: "",
        courierProvider: undefined,
        courierOptions: {
          item_description: "General Item",
          item_quantity: 1,
          item_weight: 0.5,
          delivery_type: 48,
        },
      })

      const courierText = newDelivery.courierProvider
        ? ` with ${newDelivery.courierProvider.charAt(0).toUpperCase() + newDelivery.courierProvider.slice(1)} Courier`
        : ''

      toast({
        title: "Success",
        description: `Delivery created successfully${courierText}`,
      })
    } catch (error) {
      console.error('Failed to create delivery:', error)
      toast({
        title: "Error",
        description: "Failed to create delivery. Please try again.",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setNewDelivery(prev => ({
        ...prev,
        orderId,
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        deliveryAddress: order.shippingAddress || "",
        deliveryCity: order.shippingCity || "",
        deliveryState: order.shippingState || "",
        deliveryZipCode: order.shippingZipCode || "",
      }))
    }
  }

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      (delivery.orderId && delivery.orderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.customerName && delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.trackingNumber && delivery.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.deliveryAddress && delivery.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()))

    if (activeTab === "all") return matchesSearch
    return matchesSearch && delivery.status.toLowerCase().replace(" ", "-") === activeTab
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      assigned: "outline",
      picked_up: "default",
      in_transit: "default",
      out_for_delivery: "default",
      delivered: "default",
      failed: "destructive",
      returned: "destructive",
    }

    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      assigned: "bg-blue-100 text-blue-800",
      picked_up: "bg-blue-100 text-blue-800",
      in_transit: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      failed: "",
      returned: "",
    }

    return (
      <Badge variant={variants[status] || "secondary"} className={colors[status] || ""}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    )
  }

  const deliveryStats = {
    total: deliveries.length,
    pending: deliveries.filter((d) => d.status === "pending").length,
    inTransit: deliveries.filter((d) => d.status === "in_transit").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading deliveries...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Delivery Management</h1>
          <p className="text-muted-foreground">Track and manage all deliveries</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => paperflySyncService.performSync(true)}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Paperfly
          </Button>
          <Dialog open={showNewDeliveryDialog} onOpenChange={setShowNewDeliveryDialog}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                New Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Delivery</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Order Selection */}
                <div className="space-y-2">
                  <Label htmlFor="order-select">Select Order *</Label>
                  <Select onValueChange={handleOrderSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.customerName || 'Unknown Customer'} (৳{order.total})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Customer Name *</Label>
                    <Input
                      id="customer-name"
                      value={newDelivery.customerName}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Phone Number</Label>
                    <Input
                      id="customer-phone"
                      value={newDelivery.customerPhone}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-2">
                  <Label htmlFor="delivery-address">Delivery Address *</Label>
                  <Textarea
                    id="delivery-address"
                    value={newDelivery.deliveryAddress}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder="Enter complete delivery address"
                    rows={3}
                  />
                </div>

                {/* Address Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-city">City</Label>
                    <Input
                      id="delivery-city"
                      value={newDelivery.deliveryCity}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveryCity: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-state">State (optional)</Label>
                    <Input
                      id="delivery-state"
                      value={newDelivery.deliveryState}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveryState: e.target.value }))}
                      placeholder="State (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-zip">ZIP Code (optional)</Label>
                    <Input
                      id="delivery-zip"
                      value={newDelivery.deliveryZipCode}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveryZipCode: e.target.value }))}
                      placeholder="ZIP Code (optional)"
                    />
                  </div>
                </div>

                {/* Delivery Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-type">Delivery Type</Label>
                    <Select onValueChange={(value) => setNewDelivery(prev => ({ ...prev, deliveryType: value as any }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="same_day">Same Day</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated-date">Estimated Delivery Date</Label>
                    <Input
                      id="estimated-date"
                      type="date"
                      value={newDelivery.estimatedDeliveryDate}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Courier Integration */}
                {courierAvailable && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div>
                      <h4 className="font-medium">Courier Service Integration</h4>
                      <p className="text-sm text-muted-foreground">Use professional courier services for delivery</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="courier-provider">Courier Provider</Label>
                      <Select
                        value={newDelivery.courierProvider || ""}
                        onValueChange={(value) => setNewDelivery(prev => ({
                          ...prev,
                          courierProvider: value as 'steadfast' | 'paperfly' | 'pathao' | undefined,
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select courier provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No courier service</SelectItem>
                          {courierProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider.charAt(0).toUpperCase() + provider.slice(1)} Courier
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {newDelivery.courierProvider && (
                      <div className="space-y-4">
                        {newDelivery.courierProvider === 'pathao' && (
                          <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-md border">
                            <div className="space-y-2 col-span-3">
                              <Label htmlFor="pathao-store">Pathao Store *</Label>
                              <Select
                                value={newDelivery.courierOptions?.store_id?.toString()}
                                onValueChange={(value) => {
                                  setNewDelivery(prev => ({
                                    ...prev,
                                    courierOptions: {
                                      ...prev.courierOptions,
                                      store_id: Number(value)
                                    }
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Store" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pathaoStores.map((store: any) => (
                                    <SelectItem key={store.store_id} value={store.store_id?.toString()}>
                                      {store.store_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="pathao-city">Pathao City *</Label>
                              <Select
                                value={newDelivery.courierOptions?.recipient_city?.toString()}
                                onValueChange={(value) => {
                                  setNewDelivery(prev => ({
                                    ...prev,
                                    courierOptions: {
                                      ...prev.courierOptions,
                                      recipient_city: Number(value),
                                      recipient_zone: undefined, // Reset zone
                                      recipient_area: undefined  // Reset area
                                    }
                                  }))
                                  // Fetch zones for this city
                                  deliveryService.getPathaoZones(value).then(zones => setPathaoZones(zones)).catch(console.error)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select City" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pathaoCities.map((city: any) => (
                                    <SelectItem key={city.city_id} value={city.city_id?.toString()}>
                                      {city.city_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="pathao-zone">Pathao Zone *</Label>
                              <Select
                                value={newDelivery.courierOptions?.recipient_zone?.toString()}
                                disabled={!newDelivery.courierOptions?.recipient_city}
                                onValueChange={(value) => {
                                  setNewDelivery(prev => ({
                                    ...prev,
                                    courierOptions: {
                                      ...prev.courierOptions,
                                      recipient_zone: Number(value),
                                      recipient_area: undefined // Reset area
                                    }
                                  }))
                                  // Fetch areas for this zone
                                  deliveryService.getPathaoAreas(value).then(areas => setPathaoAreas(areas)).catch(console.error)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Zone" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pathaoZones.map((zone: any) => (
                                    <SelectItem key={zone.zone_id} value={zone.zone_id?.toString()}>
                                      {zone.zone_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="pathao-area">Pathao Area (Optional)</Label>
                              <Select
                                value={newDelivery.courierOptions?.recipient_area?.toString()}
                                disabled={!newDelivery.courierOptions?.recipient_zone}
                                onValueChange={(value) => {
                                  setNewDelivery(prev => ({
                                    ...prev,
                                    courierOptions: {
                                      ...prev.courierOptions,
                                      recipient_area: Number(value)
                                    }
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Area" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pathaoAreas.map((area: any) => (
                                    <SelectItem key={area.area_id} value={area.area_id?.toString()}>
                                      {area.area_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="delivery-fee">Cash on Delivery Amount (৳)</Label>
                          <Input
                            id="delivery-fee"
                            type="number"
                            value={newDelivery.deliveryFee}
                            onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveryFee: Number(e.target.value) }))}
                            placeholder="Enter COD amount"
                            min="0"
                          />
                          <p className="text-xs text-muted-foreground">
                            Amount to be collected by courier upon delivery
                          </p>
                        </div>

                        {/* Courier Options */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="item-description">Item Description</Label>
                            <Input
                              id="item-description"
                              value={newDelivery.courierOptions?.item_description || ""}
                              onChange={(e) => setNewDelivery(prev => ({
                                ...prev,
                                courierOptions: {
                                  ...prev.courierOptions,
                                  item_description: e.target.value
                                }
                              }))}
                              placeholder="General Item"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="item-weight">Item Weight (kg)</Label>
                            <Input
                              id="item-weight"
                              type="number"
                              step="0.1"
                              value={newDelivery.courierOptions?.item_weight || 0.5}
                              onChange={(e) => setNewDelivery(prev => ({
                                ...prev,
                                courierOptions: {
                                  ...prev.courierOptions,
                                  item_weight: Number(e.target.value)
                                }
                              }))}
                              placeholder="0.5"
                              min="0.1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="item-quantity">Item Quantity</Label>
                            <Input
                              id="item-quantity"
                              type="number"
                              value={newDelivery.courierOptions?.item_quantity || 1}
                              onChange={(e) => setNewDelivery(prev => ({
                                ...prev,
                                courierOptions: {
                                  ...prev.courierOptions,
                                  item_quantity: Number(e.target.value)
                                }
                              }))}
                              placeholder="1"
                              min="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="delivery-type">Delivery Type</Label>
                            <Select
                              value={newDelivery.courierOptions?.delivery_type?.toString() || "48"}
                              onValueChange={(value) => setNewDelivery(prev => ({
                                ...prev,
                                courierOptions: {
                                  ...prev.courierOptions,
                                  delivery_type: Number(value)
                                }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="24">24 Hours</SelectItem>
                                <SelectItem value="48">48 Hours</SelectItem>
                                <SelectItem value="72">72 Hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes and Instructions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newDelivery.notes}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Internal notes"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-instructions">Delivery Instructions</Label>
                    <Textarea
                      id="delivery-instructions"
                      value={newDelivery.deliveryInstructions}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                      placeholder="Special instructions for delivery"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewDeliveryDialog(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDelivery} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Create Delivery
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{deliveryStats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{deliveryStats.inTransit}</div>
            <p className="text-xs text-muted-foreground">On the way</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveryStats.delivered}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery List */}
      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>Track all delivery orders and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-transit">In Transit</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.orderId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{delivery.customerName}</div>
                          {delivery.customerPhone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {delivery.customerPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <span className="text-sm">{delivery.deliveryAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {delivery.trackingNumber ? (
                          <div className="text-sm">
                            <div className="font-medium">{delivery.courierService}</div>
                            <div className="text-muted-foreground">{delivery.trackingNumber}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>
                        {delivery.actualDeliveryDate ?
                          new Date(delivery.actualDeliveryDate).toLocaleDateString() :
                          delivery.estimatedDeliveryDate ?
                            new Date(delivery.estimatedDeliveryDate).toLocaleDateString() :
                            'TBD'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Truck className="mr-2 h-4 w-4" />
                              Track Package
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="mr-2 h-4 w-4" />
                              Call Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
