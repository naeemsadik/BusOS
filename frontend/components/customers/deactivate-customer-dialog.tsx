"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Customer, customersService } from "@/lib/customers-service"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface DeactivateCustomerDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerDeactivated: (customer: Customer) => void
}

export function DeactivateCustomerDialog({ 
  customer, 
  open, 
  onOpenChange,
  onCustomerDeactivated
}: DeactivateCustomerDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleDeactivate = async () => {
    if (!customer?.id) return
    
    setIsLoading(true)
    try {
      const updatedCustomer = await customersService.updateCustomer(customer.id, {
        status: 'inactive'
      })
      
      toast({
        title: "Customer deactivated",
        description: `${customer.name} has been deactivated.`,
      })
      
      onCustomerDeactivated(updatedCustomer)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to deactivate customer:", error)
      toast({
        title: "Action failed",
        description: "There was an error deactivating the customer.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="mx-4 max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg">Are you sure?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            This will deactivate {customer?.name}'s account. The customer will remain in your database but will be marked as inactive.
            You can reactivate the customer later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
          {isLoading ? (
            <Button disabled className="w-full sm:w-auto">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deactivating...
            </Button>
          ) : (
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              Deactivate
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
