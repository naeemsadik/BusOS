"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Building,
  Phone,
  Mail,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react"
import { supplierService, Supplier, SupplierStats } from "@/lib/supplier-service"
import { formatLocalDate } from "@/lib/date-utils"
import { SupplierDialog } from "@/components/suppliers/supplier-dialog"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"
import { useCurrency } from "@/contexts/currency-context"

export default function SuppliersPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.SUPPLIERS}>
      <SuppliersPageContent />
    </PermissionGuardPage>
  )
}

function SuppliersPageContent() {
  const { formatCurrency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    loadSuppliers()
    loadStats()
  }, [currentPage, activeTab, searchTerm])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const query = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: activeTab === 'active' ? 'active' as const : activeTab === 'inactive' ? 'inactive' as const : undefined,
      }
      const response = await supplierService.getAll(query)
      setSuppliers(response.suppliers)
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await supplierService.getStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load supplier stats:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return
    
    try {
      await supplierService.delete(id)
      toast.success('Supplier deleted successfully')
      loadSuppliers()
      loadStats()
    } catch (error) {
      console.error('Failed to delete supplier:', error)
      toast.error('Failed to delete supplier')
    }
  }

  const handleAddSupplier = () => {
    setSelectedSupplier(null)
    setShowSupplierDialog(true)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowSupplierDialog(true)
  }

  const handleSupplierSaved = (supplier: Supplier) => {
    loadSuppliers()
    loadStats()
  }

  const filteredSuppliers = suppliers ? suppliers.filter((supplier) => {
    if (activeTab === "outstanding") return supplier.outstandingAmount >= 0
    return true
  }) : []

  const getStatusBadge = (status: Supplier["status"]) => {
    return status === "active" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )
  }

  // Currency formatting is now handled by useCurrency hook

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Supplier Management</h1>
          <p className="text-muted-foreground">Manage suppliers and purchase orders</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleAddSupplier} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.totalSuppliers.toLocaleString() : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.activeSuppliers} active` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalPurchases) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">All time purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats ? formatCurrency(stats.outstandingAmount) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.categories.length : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">Active</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs sm:text-sm">Inactive</TabsTrigger>
            <TabsTrigger value="outstanding" className="text-xs sm:text-sm">Outstanding</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Total Purchases</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Last Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{supplier.name}</div>
                              <div className="text-sm text-muted-foreground">{supplier.company}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <Mail className="w-3 h-3 mr-1" />
                                {supplier.email}
                              </div>
                              {supplier.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {supplier.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {supplier.category ? (
                              <Badge variant="outline">{supplier.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No category</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(supplier.totalPurchases)}</TableCell>
                          <TableCell>
                            <span className={supplier.outstandingAmount > 0 ? "text-red-600 font-medium" : ""}>
                              {formatCurrency(supplier.outstandingAmount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {supplier.lastOrderDate ? formatLocalDate(supplier.lastOrderDate) : 'Never'}
                          </TableCell>
                          <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(supplier.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredSuppliers.map((supplier) => (
                  <Card key={supplier.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-lg">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">{supplier.company}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(supplier.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(supplier.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Email:</span>
                          <span className="text-sm">{supplier.email}</span>
                        </div>
                        
                        {supplier.phone && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <span className="text-sm">{supplier.phone}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Category:</span>
                          {supplier.category ? (
                            <Badge variant="outline">{supplier.category}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No category</span>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Purchases:</span>
                          <span className="font-semibold">{formatCurrency(supplier.totalPurchases)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Outstanding:</span>
                          <span className={supplier.outstandingAmount > 0 ? "text-red-600 font-semibold" : "font-semibold"}>
                            {formatCurrency(supplier.outstandingAmount)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Last Order:</span>
                          <span className="text-sm">{supplier.lastOrderDate ? formatLocalDate(supplier.lastOrderDate) : 'Never'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {filteredSuppliers.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No suppliers found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Dialog */}
      <SupplierDialog
        supplier={selectedSupplier}
        open={showSupplierDialog}
        onOpenChange={setShowSupplierDialog}
        onSupplierSaved={handleSupplierSaved}
      />
    </div>
  )
}
