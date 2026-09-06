"use client"

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, CreditCard, Download, Filter, Loader2, Plus, Receipt, TrendingUp, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { expensesService, type Expense, type CreateExpenseData, type MonthlyExpenses } from "@/lib/expenses-service";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PermissionGuardPage from "@/components/permission-guard-page";
import { PermissionModuleType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/contexts/currency-context";
import { Progress } from "@/components/ui/progress";
import { MonthlyExpenseChart } from "@/components/charts/monthly-expense-chart";

const expenseCategories = [
  { value: "office_supplies", label: "Office Supplies" },
  { value: "inventory", label: "Inventory" },
  { value: "marketing", label: "Marketing" },
  { value: "utilities", label: "Utilities" },
  { value: "travel", label: "Travel" },
  { value: "professional_services", label: "Professional Services" },
  { value: "rent", label: "Rent" },
  { value: "equipment", label: "Equipment" },
  { value: "shipping", label: "Shipping" },
  { value: "software", label: "Software" },
  { value: "taxes", label: "Taxes" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
]

const expenseFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  amount: z.number().positive({ message: "Amount must be positive" }),
  category: z.string().min(1, { message: "Please select a category" }),
  expenseDate: z.date(),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export default function ExpensesPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.EXPENSES}>
      <ExpensesPageContent />
    </PermissionGuardPage>
  )
}

function ExpensesPageContent() {
  const { formatCurrency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenses | null>(null)
  const { toast } = useToast()

  // Create expense form
  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      category: "",
      expenseDate: new Date(),
      vendor: "",
      paymentMethod: "",
      reference: "",
      notes: "",
    },
  })

  // Edit expense form
  const editForm = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      category: "",
      expenseDate: new Date(),
      vendor: "",
      paymentMethod: "",
      reference: "",
      notes: "",
    },
  })

  // Load expenses data
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true)
        const response = await expensesService.getExpenses()
        setExpenses(response.expenses)
      } catch (error) {
        console.error('Failed to load expenses:', error)
        toast({
          title: "Error",
          description: "Failed to load expenses. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadExpenses()
  }, [toast])
  
  // Monthly expenses data for chart
  useEffect(() => {
    const loadMonthlyExpenses = async () => {
      try {
        const response = await expensesService.getMonthlyExpenses()
        setMonthlyExpenses(response)
      } catch (error) {
        console.error('Failed to load monthly expenses:', error)
      }
    }

    loadMonthlyExpenses()
  }, [])

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      (expense.title && expense.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.vendor && expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof expenseFormSchema>) => {
    setIsLoading(true)
    try {
      const expenseData: CreateExpenseData = {
        ...values,
        expenseDate: format(values.expenseDate, "yyyy-MM-dd"),
      } as CreateExpenseData

      const newExpense = await expensesService.createExpense(expenseData)
      
      // Add the new expense to the state
      setExpenses(current => [newExpense, ...current])
      
      toast({
        title: "Expense created",
        description: "Your expense has been successfully created.",
      })
      
      setIsDialogOpen(false)
      form.reset()
    } catch (error) {
      console.error("Failed to create expense:", error)
      toast({
        title: "Failed to create expense",
        description: "There was an error creating the expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle edit form submission
  const onEditSubmit = async (values: z.infer<typeof expenseFormSchema>) => {
    if (!editingExpense) return
    
    setIsLoading(true)
    try {
      const expenseData: CreateExpenseData = {
        ...values,
        expenseDate: format(values.expenseDate, "yyyy-MM-dd"),
      } as CreateExpenseData

      const updatedExpense = await expensesService.updateExpense(editingExpense.id, expenseData)
      
      // Update the expense in the state
      setExpenses(current => current.map(expense => 
        expense.id === editingExpense.id ? updatedExpense : expense
      ))
      
      toast({
        title: "Expense updated",
        description: "Your expense has been successfully updated.",
      })
      
      setIsEditDialogOpen(false)
      setEditingExpense(null)
      editForm.reset()
    } catch (error) {
      console.error("Failed to update expense:", error)
      toast({
        title: "Failed to update expense",
        description: "There was an error updating the expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete expense
  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete "${expense.title}"?`)) return
    
    try {
      await expensesService.deleteExpense(expense.id)
      
      // Remove the expense from the state
      setExpenses(current => current.filter(e => e.id !== expense.id))
      
      toast({
        title: "Expense deleted",
        description: "The expense has been successfully deleted.",
      })
    } catch (error) {
      console.error("Failed to delete expense:", error)
      toast({
        title: "Failed to delete expense",
        description: "There was an error deleting the expense. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    editForm.reset({
      title: expense.title,
      description: expense.description || "",
      amount: expense.amount,
      category: expense.category as any,
      expenseDate: new Date(expense.expenseDate),
      vendor: expense.vendor || "",
      paymentMethod: expense.paymentMethod || "",
      reference: expense.reference || "",
      notes: expense.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const getPaymentMethodBadge = (method?: string) => {
    return <Badge variant="outline">{method || 'N/A'}</Badge>
  }

  // Currency formatting is now handled by useCurrency hook

  const expenseStats = {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    thisMonth: expenses.filter((e) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      return e.expenseDate.startsWith(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
    }).reduce((sum, e) => sum + e.amount, 0),
    count: expenses.length,
    averageAmount: expenses.length > 0 ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length : 0,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading expenses...</span>
      </div>
    )
  }

  const categoryBreakdown = expenseCategories
    .map((categoryItem) => {
      const categoryExpenses = expenses.filter((e) => e.category === categoryItem.value)
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
      return { 
        category: categoryItem.label, 
        value: categoryItem.value,
        total, 
        count: categoryExpenses.length,
        percentage: expenses.length > 0 ? Math.round((categoryExpenses.length / expenses.length) * 100) : 0
      }
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)



  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Track and manage business expenses</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Create a new expense record to track your business spending
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Expense title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor name (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Input placeholder="Cash, Card, etc. (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Receipt or invoice number (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Expense
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
                <DialogDescription>
                  Update the expense record
                </DialogDescription>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Expense title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor name (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Input placeholder="Cash, Card, etc. (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={editForm.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Receipt or invoice number (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Expense
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenseStats.total)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenseStats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.filter(e => {
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                return e.expenseDate.startsWith(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
              }).length} expense records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Count</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseStats.count}</div>
            <p className="text-xs text-muted-foreground">
              Total expense records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenseStats.averageAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Average per expense
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Expenses Table */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Expense Transactions</CardTitle>
                <div className="w-[250px]">
                  <Input
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="font-medium">{expense.title}</div>
                          {expense.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{expense.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>
                          {expenseCategories.find(c => c.value === expense.category)?.label || expense.category}
                        </TableCell>
                        <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getPaymentMethodBadge(expense.paymentMethod)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditExpense(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No expense records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {categoryBreakdown.length > 0 ? (
                categoryBreakdown.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{category.category}</div>
                      <div className="text-sm font-medium">{formatCurrency(category.total)}</div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {category.percentage}% of total expenses ({category.count} transactions)
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No expense data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Expenses Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyExpenses && monthlyExpenses.data && monthlyExpenses.data.length > 0 ? (
            <div className="space-y-4">
              <MonthlyExpenseChart data={monthlyExpenses.data} />
              
              {monthlyExpenses.data.map((monthData) => (
                <div key={monthData.month} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{monthData.monthName}</div>
                    <div className="text-xs text-muted-foreground">{monthData.count} expenses</div>
                  </div>
                  <div className="flex-1 mx-4">
                    <Progress value={(monthData.amount / (monthlyExpenses.totalAmount || 1)) * 100} className="h-2" />
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(monthData.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No monthly expense data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
