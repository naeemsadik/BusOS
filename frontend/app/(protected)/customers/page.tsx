"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Users, Star, Gift, Phone, Mail, Loader2, ChevronLeft, ChevronRight, UserCheck } from "lucide-react"
import { customersService, Customer } from "@/lib/customers-service"
import { useToast } from "@/hooks/use-toast"
import { CustomerEditDialog } from "@/components/customers/customer-edit-dialog"
import { CustomerAddDialog } from "@/components/customers/customer-add-dialog"
import { SendEmailDialog } from "@/components/customers/send-email-dialog"
import { SendSMSDialog } from "@/components/customers/send-sms-dialog"
import { DeactivateCustomerDialog } from "@/components/customers/deactivate-customer-dialog"
import { ReactivateCustomerDialog } from "@/components/customers/reactivate-customer-dialog"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"
import { useCurrency } from "@/contexts/currency-context"

export default function CustomersPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.CUSTOMERS}>
      <CustomersPageContent />
    </PermissionGuardPage>
  )
}

function CustomersPageContent() {
  const { formatCurrency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    blocked: 0,
    totalSpent: 0,
    averageSpent: 0
  })
  const { toast } = useToast()
  
  // Dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)

  // Function to load customer stats
  const loadCustomerStats = async () => {
    try {
      const stats = await customersService.getCustomerStats()
      setCustomerStats(stats)
    } catch (error) {
      console.error('Failed to load customer stats:', error)
      // Don't show error toast for stats as it's not critical
    }
  }

  // Function to load customers data
  const loadCustomers = async () => {
    try {
      setLoading(true)
      const response = await customersService.getCustomers({
        search: searchTerm || undefined,
        page: currentPage,
        limit: pageSize
      })
      setCustomers(response.customers)
      setTotalCustomers(response.total)
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error('Failed to load customers:', error)
      toast({
        title: "Error",
        description: "Failed to load customers. Please refresh the page.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Load customers data on mount and when dependencies change
  useEffect(() => {
    loadCustomers()
  }, [currentPage, pageSize])

  // Load customer stats on mount
  useEffect(() => {
    loadCustomerStats()
  }, [])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1) // Reset to first page when searching
      loadCustomers()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Listen for order deletion events to refresh customer data
  useEffect(() => {
    const handleOrdersDeleted = (event: CustomEvent) => {
      // Refresh customers data and stats to update totals
      loadCustomers()
      loadCustomerStats()
    }

    window.addEventListener('ordersDeleted', handleOrdersDeleted as EventListener)

    return () => {
      window.removeEventListener('ordersDeleted', handleOrdersDeleted as EventListener)
    }
  }, [])

  // Handle customer actions
  const handleAddCustomer = () => {
    setIsAddDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsEditDialogOpen(true)
  }

  const handleSendEmail = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsEmailDialogOpen(true)
  }

  const handleSendSMS = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsSmsDialogOpen(true)
  }

  const handleDeactivateCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeactivateDialogOpen(true)
  }

  const handleReactivateCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsReactivateDialogOpen(true)
  }

  const handleCustomerAdded = (newCustomer: Customer) => {
    // Refresh the customer list and stats
    loadCustomers()
    loadCustomerStats()
  }

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers(customers.map(c => 
      c.id === updatedCustomer.id ? updatedCustomer : c
    ))
    // Also refresh stats in case status changed
    loadCustomerStats()
  }

  // Since we're using server-side pagination and filtering, 
  // the customers are already filtered by the API
  const filteredCustomers = customers

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : status === "inactive" ? (
      <Badge variant="secondary">Inactive</Badge>
    ) : (
      <Badge variant="destructive">Blocked</Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading customers...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">Manage your customer database and relationships</p>
        </div>
        <div className="flex gap-2">
          <Button className="w-full sm:w-auto" onClick={handleAddCustomer}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.total}</div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{customerStats.active}</div>
            <p className="text-xs text-muted-foreground">Recently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Star className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(customerStats.totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">Customer lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Spent</CardTitle>
            <Gift className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(customerStats.averageSpent)}
            </div>
            <p className="text-xs text-muted-foreground">Average per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>Manage your customer database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                </p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span className="text-sm">{customer.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(customer)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendSMS(customer)}>
                            <Phone className="mr-2 h-4 w-4" />
                            Send SMS
                          </DropdownMenuItem>
                          {customer.status === "active" ? (
                            <DropdownMenuItem onClick={() => handleDeactivateCustomer(customer)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReactivateCustomer(customer)} className="text-green-600">
                              <UserCheck className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Orders:</span>
                        <div className="font-medium">{customer.totalOrders}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Spent:</span>
                        <div className="font-medium">৳{Number(customer.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div>{getStatusBadge(customer.status)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Order:</span>
                        <div className="font-medium">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
            
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-6">
                <div className="text-sm text-muted-foreground text-center">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm font-medium px-2">
                    {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span className="text-sm">{customer.phone || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{customer.totalOrders}</TableCell>
                      <TableCell>৳{Number(customer.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail(customer)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendSMS(customer)}>
                              <Phone className="mr-2 h-4 w-4" />
                              Send SMS
                            </DropdownMenuItem>
                            {customer.status === "active" ? (
                              <DropdownMenuItem onClick={() => handleDeactivateCustomer(customer)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleReactivateCustomer(customer)} className="text-green-600">
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <CustomerAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Edit Customer Dialog */}
      {isEditDialogOpen && selectedCustomer && (
        <CustomerEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          customer={selectedCustomer}
          onCustomerUpdated={(updatedCustomer) => {
            setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)))
            toast({
              title: "Success",
              description: "Customer details updated successfully.",
              variant: "default"
            })
          }}
        />
      )}

      {/* Send Email Dialog */}
      {isEmailDialogOpen && selectedCustomer && (
        <SendEmailDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          customer={selectedCustomer}
        />
      )}

      {/* Send SMS Dialog */}
      {isSmsDialogOpen && selectedCustomer && (
        <SendSMSDialog
          open={isSmsDialogOpen}
          onOpenChange={setIsSmsDialogOpen}
          customer={selectedCustomer}
        />
      )}

      {/* Deactivate Customer Dialog */}
      {isDeactivateDialogOpen && selectedCustomer && (
        <DeactivateCustomerDialog
          open={isDeactivateDialogOpen}
          onOpenChange={setIsDeactivateDialogOpen}
          customer={selectedCustomer}
          onCustomerDeactivated={(deactivatedCustomer) => {
            setCustomers((prev) => prev.map((c) => (c.id === deactivatedCustomer.id ? deactivatedCustomer : c)))
            loadCustomerStats() // Refresh stats
            toast({
              title: "Success",
              description: "Customer status updated successfully.",
              variant: "default"
            })
          }}
        />
      )}

      {/* Reactivate Customer Dialog */}
      {isReactivateDialogOpen && selectedCustomer && (
        <ReactivateCustomerDialog
          open={isReactivateDialogOpen}
          onOpenChange={setIsReactivateDialogOpen}
          customer={selectedCustomer}
          onCustomerReactivated={(reactivatedCustomer) => {
            setCustomers((prev) => prev.map((c) => (c.id === reactivatedCustomer.id ? reactivatedCustomer : c)))
            loadCustomerStats() // Refresh stats
            toast({
              title: "Success",
              description: "Customer reactivated successfully.",
              variant: "default"
            })
          }}
        />
      )}
    </div>
  )
}
