"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { User, Search, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { OrderDetails } from "./types"

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
}

interface CustomerDetailsProps {
  selectedCustomer: Customer | null
  orderDetails: OrderDetails
  sampleCustomers: Customer[]
  onSelectCustomer: (customer: Customer | null) => void
  onUpdateOrderDetails: (details: Partial<OrderDetails>) => void
  onClearErrors: () => void
}

export function CustomerDetails({
  selectedCustomer,
  orderDetails,
  sampleCustomers,
  onSelectCustomer,
  onUpdateOrderDetails,
  onClearErrors
}: CustomerDetailsProps) {
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter customers based on search input
  useEffect(() => {
    // Don't show results if a customer is already selected
    if (selectedCustomer) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    const searchTerm = orderDetails.customerName.toLowerCase() || orderDetails.customerPhone || orderDetails.customerEmail || "";
    if (searchTerm.length >= 2) {
      const results = sampleCustomers.filter(
        customer => 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (customer.phone && customer.phone.includes(searchTerm)) ||
          (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(results);
      setShowResults(results.length > 0);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [orderDetails.customerName, orderDetails.customerPhone, orderDetails.customerEmail, sampleCustomers, selectedCustomer]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer)
    setShowResults(false)
    onClearErrors()
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2 relative" ref={searchContainerRef}>
            <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
            <div className="relative">
              <Input
                id="customerName"
                placeholder="Enter customer name..."
                value={orderDetails.customerName}
                onChange={(e) => {
                  onUpdateOrderDetails({ customerName: e.target.value });
                  onClearErrors();
                  // Clear selected customer when user starts typing
                  if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                    onSelectCustomer(null);
                  }
                }}
                className="w-full pr-8"
              />
              <Search className="absolute right-2 sm:right-3 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </div>
            
            {showResults && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((customer) => (
                  <div 
                    key={customer.id}
                    className="p-2 sm:p-3 hover:bg-accent cursor-pointer border-b last:border-0"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="font-medium text-sm">{customer.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {customer.phone && <div>{customer.phone}</div>}
                      {customer.email && <div>{customer.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerPhone" className="text-sm">Phone Number (Optional)</Label>
            <Input
              id="customerPhone"
              placeholder="Enter phone number..."
              value={orderDetails.customerPhone}
              onChange={(e) => {
                onUpdateOrderDetails({ customerPhone: e.target.value });
                onClearErrors();
                // Clear selected customer when user starts typing
                if (selectedCustomer && e.target.value !== selectedCustomer.phone) {
                  onSelectCustomer(null);
                }
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerEmail" className="text-sm">Email (Optional)</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="Enter email address..."
              value={orderDetails.customerEmail || ""}
              onChange={(e) => {
                onUpdateOrderDetails({ customerEmail: e.target.value });
                onClearErrors();
                // Clear selected customer when user starts typing
                if (selectedCustomer && e.target.value !== selectedCustomer.email) {
                  onSelectCustomer(null);
                }
              }}
            />
          </div>
          
        </div>
        
        {selectedCustomer && (
          <div className="mt-3 p-2 sm:p-3 bg-accent rounded-lg">
            <div className="flex items-start justify-between">
              <div className="text-sm flex-1 min-w-0">
                <div className="font-medium text-xs sm:text-sm">Customer Selected:</div>
                <div className="text-xs sm:text-sm truncate">{selectedCustomer.name} - {selectedCustomer.phone}</div>
                {selectedCustomer.email && (
                  <div className="text-xs text-muted-foreground truncate">{selectedCustomer.email}</div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onSelectCustomer(null);
                  onUpdateOrderDetails({
                    customerName: "",
                    customerPhone: "",
                    customerEmail: ""
                  });
                  onClearErrors();
                }}
                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0 ml-2"
                title="Remove selected customer"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
