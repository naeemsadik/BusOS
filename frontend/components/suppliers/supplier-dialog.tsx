"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Supplier, CreateSupplierData, UpdateSupplierData, supplierService } from "@/lib/supplier-service"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"

interface SupplierDialogProps {
  supplier?: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupplierSaved: (supplier: Supplier) => void
}

export function SupplierDialog({ 
  supplier, 
  open, 
  onOpenChange,
  onSupplierSaved
}: SupplierDialogProps) {
  const { currency } = useCurrency()
  // Removed isLoading state
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '30',
    category: '',
    status: 'active',
    notes: '',
    totalPurchases: 0,
    outstandingAmount: 0,
  })

  // Reset form when dialog opens/closes or supplier changes
  useEffect(() => {
    if (open) {
      if (supplier) {
        setFormData({
          name: supplier.name,
          company: supplier.company,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          paymentTerms: supplier.paymentTerms,
          category: supplier.category,
          status: supplier.status,
          notes: supplier.notes || '',
          totalPurchases: supplier.totalPurchases || 0,
          outstandingAmount: supplier.outstandingAmount || 0,
        })
      } else {
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          address: '',
          paymentTerms: '30',
          category: '',
          status: 'active',
          notes: '',
          totalPurchases: 0,
          outstandingAmount: 0,
        })
      }
    }
  }, [open, supplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  // Removed loading state

    try {
      // Validate required fields (based on backend DTO)
      if (!formData.name.trim()) {
        toast.error('Supplier name is required')
        return
      }
      if (!formData.company.trim()) {
        toast.error('Company name is required')
        return
      }
      if (!formData.email.trim()) {
        toast.error('Email is required')
        return
      }

      // Clean the form data to remove any undefined/empty values
      const cleanFormData = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        email: formData.email.trim(),
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
        ...(formData.address?.trim() && { address: formData.address.trim() }),
        ...(formData.category?.trim() && { category: formData.category.trim() }),
        ...(formData.paymentTerms && { paymentTerms: formData.paymentTerms }),
        ...(formData.status && { status: formData.status }),
        ...(formData.notes?.trim() && { notes: formData.notes.trim() }),
        totalPurchases: Number(formData.totalPurchases) || 0,
        outstandingAmount: Number(formData.outstandingAmount) || 0,
      }

      let savedSupplier: Supplier

      if (supplier) {
        // Update existing supplier
        savedSupplier = await supplierService.update(supplier.id, cleanFormData as UpdateSupplierData)
        toast.success('Supplier updated successfully')
      } else {
        // Create new supplier
        savedSupplier = await supplierService.create(cleanFormData)
        toast.success('Supplier created successfully')
      }

      onSupplierSaved(savedSupplier)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save supplier:', error)
      toast.error(supplier ? 'Failed to update supplier' : 'Failed to create supplier')
  }
  }

  const handleInputChange = (field: keyof CreateSupplierData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </DialogTitle>
          <DialogDescription>
            {supplier 
              ? 'Update the supplier information below.' 
              : 'Fill in the details to add a new supplier to your system.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter supplier name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="food">Food & Beverages</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="office">Office Supplies</SelectItem>
                  <SelectItem value="medical">Medical Supplies</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) => handleInputChange('paymentTerms', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cash on Delivery</SelectItem>
                  <SelectItem value="15">Net 15</SelectItem>
                  <SelectItem value="30">Net 30</SelectItem>
                  <SelectItem value="45">Net 45</SelectItem>
                  <SelectItem value="60">Net 60</SelectItem>
                  <SelectItem value="90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPurchases">Total Purchases ({currency.currencySymbol})</Label>
              <Input
                id="totalPurchases"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalPurchases}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                  handleInputChange('totalPurchases', isNaN(value) ? 0 : value)
                }}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outstandingAmount">Outstanding Amount ({currency.currencySymbol})</Label>
              <Input
                id="outstandingAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.outstandingAmount}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                  handleInputChange('outstandingAmount', isNaN(value) ? 0 : value)
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter supplier address"
              rows={2}
              className="min-h-[60px] sm:min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about the supplier"
              rows={2}
              className="min-h-[60px] sm:min-h-[100px]"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {supplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
