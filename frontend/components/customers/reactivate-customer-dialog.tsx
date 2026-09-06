"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, UserCheck } from "lucide-react"
import { customersService, Customer } from "@/lib/customers-service"
import { useToast } from "@/hooks/use-toast"

interface ReactivateCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer
  onCustomerReactivated: (customer: Customer) => void
}

export function ReactivateCustomerDialog({
  open,
  onOpenChange,
  customer,
  onCustomerReactivated
}: ReactivateCustomerDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleReactivate = async () => {
    try {
      setLoading(true)
      const updatedCustomer = await customersService.updateCustomer(customer.id, {
        status: "active"
      })
      
      onCustomerReactivated(updatedCustomer)
      onOpenChange(false)
      
      toast({
        title: "Success",
        description: `${customer.name} has been reactivated successfully.`,
        variant: "default"
      })
    } catch (error: any) {
      console.error('Failed to reactivate customer:', error)
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to reactivate customer. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Reactivate Customer
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to reactivate this customer? They will be able to place orders again.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Customer:</strong> {customer.name}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Email:</strong> {customer.email}
            </p>
            {customer.phone && (
              <p className="text-sm text-muted-foreground">
                <strong>Phone:</strong> {customer.phone}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              <strong>Current Status:</strong> {customer.status}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReactivate}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reactivate Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
