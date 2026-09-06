"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ProductDialog } from "@/components/inventory/product-dialog"
import { VoiceCommandDialog } from "@/components/voice/voice-command-dialog"
import { BarcodeDialog } from "@/components/inventory/barcode-dialog"
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog"
import { DeleteConfirmDialog } from "@/components/inventory/delete-confirm-dialog"
import { CategoryDialog } from "@/components/inventory/category-dialog"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  TrendingDown,
  TrendingUp,
  Barcode,
  Settings,
  Filter,
  Download,
  RefreshCw,
  AudioLines,
} from "lucide-react"
import { inventoryService, type CreateProductData, type Product, type ProductQuery, type InventoryStats } from "@/lib/inventory-service"
import type { VoiceCommandResult } from "@/lib/voice-service"

export default function InventoryPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.INVENTORY}>
      <InventoryPageContent />
    </PermissionGuardPage>
  )
}

function InventoryPageContent() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State for dialogs
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [voiceProductDraft, setVoiceProductDraft] = useState<Partial<CreateProductData> | undefined>()
  
  // State for selected items
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  
  // State for filters and search
  const [query, setQuery] = useState<ProductQuery>({
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'ASC',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Fetch products
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['products', query],
    queryFn: () => inventoryService.getProducts(query),
  })

  // Fetch inventory stats
  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: inventoryService.getInventoryStats,
  })

  // Fetch categories for management
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: inventoryService.getCategories,
  })

  const categories = productsData?.filters?.categories || []
  const brands = productsData?.filters?.brands || []
  const suppliers = productsData?.filters?.suppliers || []

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: inventoryService.deleteProduct,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      setDeleteDialogOpen(false)
      setSelectedProduct(null)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete product',
        variant: 'destructive',
      })
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: inventoryService.bulkDeleteProducts,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Products deleted successfully',
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      setBulkDeleteDialogOpen(false)
      setSelectedProducts([])
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete products',
        variant: 'destructive',
      })
    },
  })

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(prev => ({
        ...prev,
        search: searchTerm || undefined,
        page: 1,
      }))
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleProductSuccess = () => {
    setVoiceProductDraft(undefined)
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const handleCategorySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const handleCategoryCreate = async (name: string) => {
    try {
      await inventoryService.createCategory({ name });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create category',
        variant: 'destructive',
      });
      throw error;
    }
  }

  const handleStockSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
  }

  const handleEditProduct = (product: Product) => {
    setVoiceProductDraft(undefined)
    setSelectedProduct(product)
    setProductDialogOpen(true)
  }

  const handleVoiceProduct = async (result: VoiceCommandResult) => {
    if (result.mode !== 'inventory' || result.action !== 'create_product') return

    if (result.missingFields.length > 0) {
      setSelectedProduct(null)
      setVoiceProductDraft(result.product)
      setProductDialogOpen(true)
      return `The product form is open. Complete ${result.missingFields.join(', ')} before saving the product.`
    }

    const { name, category, price, cost } = result.product
    if (
      !name ||
      !category ||
      typeof price !== 'number' ||
      typeof cost !== 'number'
    ) {
      setSelectedProduct(null)
      setVoiceProductDraft(result.product)
      setProductDialogOpen(true)
      return 'The product form is open because required product details need review.'
    }

    const product = await inventoryService.createProduct({
      ...result.product,
      name,
      category,
      price,
      cost,
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ])
    toast({
      title: 'Product created',
      description: `${product.name} was added to inventory.`,
    })
    setVoiceProductDraft(undefined)
    return `${product.name} was added to inventory successfully.`
  }

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product)
    setDeleteDialogOpen(true)
  }

  const handleGenerateBarcode = (product: Product) => {
    setSelectedProduct(product)
    setBarcodeDialogOpen(true)
  }

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product)
    setStockDialogOpen(true)
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && productsData?.data) {
      setSelectedProducts(productsData.data.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return
    setBulkDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id)
    }
  }

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category)
    setCategoryDialogOpen(true)
  }

  const clearFilters = () => {
    setQuery({
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'ASC',
    })
    setSearchTerm('')
  }

  const confirmBulkDelete = () => {
    if (selectedProducts.length > 0) {
      bulkDeleteMutation.mutate(selectedProducts)
    }
  }

  const getStatusBadge = (status: Product["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Inactive
          </Badge>
        )
      case "discontinued":
        return <Badge variant="destructive">Discontinued</Badge>
    }
  }

  const getStockStatusBadge = (stockStatus: Product["stockStatus"]) => {
    switch (stockStatus) {
      case "in_stock":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            In Stock
          </Badge>
        )
      case "low_stock":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Low Stock
          </Badge>
        )
      case "out_of_stock":
        return <Badge variant="destructive">Out of Stock</Badge>
    }
  }

  const products = productsData?.data || []
  const allSelected = products.length > 0 && selectedProducts.length === products.length
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < products.length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your products and stock levels</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setVoiceDialogOpen(true)}
            className="w-full border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 sm:w-auto"
          >
            <AudioLines className="mr-2 h-4 w-4" />
            Voice add
          </Button>
          <Button onClick={() => {
            setSelectedProduct(null)
            setVoiceProductDraft(undefined)
            setProductDialogOpen(true)
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</div>
              <p className="text-xs text-muted-foreground">Unavailable items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Inventory worth</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categoriesCount}</div>
              <p className="text-xs text-muted-foreground">Product categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Manage your product inventory</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {selectedProducts.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedProducts.length})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => refetchProducts()} className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-4">
            <div className="relative flex-1 w-full min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Select
                value={query.category || 'all'}
                onValueChange={(value) => 
                  setQuery(prev => ({
                    ...prev,
                    category: value === 'all' ? undefined : value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={query.stockStatus || 'all'}
                onValueChange={(value) => 
                  setQuery(prev => ({
                    ...prev,
                    stockStatus: value === 'all' ? undefined : value as any,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full sm:w-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>

              {(query.category || query.brand || query.supplier || query.stockStatus || query.status) && (
                <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
              <Select
                value={query.brand || 'all'}
                onValueChange={(value) => 
                  setQuery(prev => ({
                    ...prev,
                    brand: value === 'all' ? undefined : value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={query.supplier || 'all'}
                onValueChange={(value) => 
                  setQuery(prev => ({
                    ...prev,
                    supplier: value === 'all' ? undefined : value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={query.status || 'all'}
                onValueChange={(value) => 
                  setQuery(prev => ({
                    ...prev,
                    status: value === 'all' ? undefined : value as any,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={query.sortBy || 'name'}
                onValueChange={(value) => 
                  setQuery(prev => ({
                    ...prev,
                    sortBy: value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="updatedAt">Updated Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-4">
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              products.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                        />
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-medium truncate">{product.name}</div>
                          {product.brand && (
                            <div className="text-sm text-muted-foreground">{product.brand}</div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAdjustStock(product)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateBarcode(product)}>
                            <Barcode className="mr-2 h-4 w-4" />
                            Barcode
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <div className="font-medium">{product.category}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <div className="font-medium">৳{product.price.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.stock}</span>
                          {product.stock <= product.minStock && (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Updated:</span>
                        <div className="font-medium">{new Date(product.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                        {getStockStatusBadge(product.stockStatus)}
                        {getStatusBadge(product.status)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div>{product.name}</div>
                          {product.brand && (
                            <div className="text-sm text-muted-foreground">{product.brand}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>৳{product.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{product.stock}</span>
                          {product.stock <= product.minStock && (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStockStatusBadge(product.stockStatus)}</TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell>
                        {new Date(product.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdjustStock(product)}>
                              <Settings className="mr-2 h-4 w-4" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateBarcode(product)}>
                              <Barcode className="mr-2 h-4 w-4" />
                              Barcode
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProduct(product)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {productsData && productsData.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-2 py-4">
              <div className="flex items-center space-x-2 order-2 sm:order-1">
                <div className="text-sm text-muted-foreground">
                  Page {productsData.page} of {productsData.totalPages}
                </div>
                <Select
                  value={query.limit?.toString() || '20'}
                  onValueChange={(value) => 
                    setQuery(prev => ({
                      ...prev,
                      limit: parseInt(value),
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={productsData.page <= 1}
                  onClick={() => setQuery(prev => ({ ...prev, page: 1 }))}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={productsData.page <= 1}
                  onClick={() => setQuery(prev => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                >
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={productsData.page >= productsData.totalPages}
                  onClick={() =>
                    setQuery(prev => ({
                      ...prev,
                      page: Math.min(productsData.totalPages, (prev.page ?? 1) + 1),
                    }))
                  }
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={productsData.page >= productsData.totalPages}
                  onClick={() => setQuery(prev => ({ ...prev, page: productsData.totalPages }))}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ProductDialog
        open={productDialogOpen}
        onOpenChange={(nextOpen) => {
          setProductDialogOpen(nextOpen)
          if (!nextOpen) setVoiceProductDraft(undefined)
        }}
        product={selectedProduct}
        initialValues={voiceProductDraft}
        onSuccess={handleProductSuccess}
        categories={allCategories.map(cat => cat.name)}
        onCategoryCreate={handleCategoryCreate}
      />

      <VoiceCommandDialog
        mode="inventory"
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        onApply={handleVoiceProduct}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
        onSuccess={handleCategorySuccess}
      />

      <BarcodeDialog
        open={barcodeDialogOpen}
        onOpenChange={setBarcodeDialogOpen}
        product={selectedProduct}
      />

      <StockAdjustmentDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        product={selectedProduct}
        onSuccess={handleStockSuccess}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        isLoading={deleteProductMutation.isPending}
      />

      <DeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Products"
        description="Are you sure you want to delete the selected products? This action cannot be undone."
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  )
}
