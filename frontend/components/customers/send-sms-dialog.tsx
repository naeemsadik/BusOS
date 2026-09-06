"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Customer } from "@/lib/customers-service"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { smsService } from "@/lib/sms-service"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface SendSMSDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendSMSDialog({ 
  customer, 
  open, 
  onOpenChange
}: SendSMSDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    message: '',
    type: 'promotional' as "promotional" | "transactional" | "otp" | "reminder"
  })

  // Character counter
  const maxChars = 160
  const remainingChars = maxChars - formData.message.length
  
  const handleChange = (field: 'message' | 'type', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!customer?.phone) {
      toast({
        title: "Missing phone number",
        description: "This customer doesn't have a phone number.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    try {
      const response = await smsService.sendSms({
        recipient: customer.phone,
        recipientName: customer.name,
        message: formData.message,
        type: formData.type
      })
      
      if (response.success) {
        toast({
          title: "SMS sent",
          description: `SMS has been sent to ${customer.name}.`,
        })
        onOpenChange(false)
      } else {
        throw new Error('Failed to send SMS')
      }
    } catch (error: any) {
      console.error("Failed to send SMS:", error)
      toast({
        title: "SMS failed",
        description: error.message || "There was an error sending the SMS.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Send SMS to {customer?.name}</DialogTitle>
          <DialogDescription>
            Send a text message to this customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Phone Number</Label>
              <Input
                id="recipient"
                value={customer?.phone || ''}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Message Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select message type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Promotional">Promotional</SelectItem>
                  <SelectItem value="Transactional">Transactional</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Reminder">Reminder</SelectItem>
                  <SelectItem value="OTP">OTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                <span className={`text-xs ${remainingChars < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {remainingChars} characters left
                </span>
              </div>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Type your SMS message..."
                rows={4}
                className="min-h-[100px] sm:min-h-[120px]"
                required
                maxLength={maxChars}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || remainingChars < 0} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send SMS"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
