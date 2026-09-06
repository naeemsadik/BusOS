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
import { emailService } from "@/lib/email-service"

interface SendEmailDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendEmailDialog({ 
  customer, 
  open, 
  onOpenChange
}: SendEmailDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
  })

  const handleChange = (field: 'subject' | 'body', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!customer?.email) {
      toast({
        title: "Missing email address",
        description: "This customer doesn't have an email address.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    try {
      const response = await emailService.sendEmail({
        to: customer.email,
        subject: formData.subject,
        body: formData.body,
      })
      
      if (response.success) {
        toast({
          title: "Email sent",
          description: `Email has been sent to ${customer.name}.`,
        })
        onOpenChange(false)
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      console.error("Failed to send email:", error)
      toast({
        title: "Email failed",
        description: error.message || "There was an error sending the email.",
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
          <DialogTitle className="text-base sm:text-lg">Send Email to {customer?.name}</DialogTitle>
          <DialogDescription>
            Send a direct email to this customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={customer?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="Email subject..."
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => handleChange('body', e.target.value)}
                placeholder="Write your email message here..."
                rows={6}
                className="min-h-[120px] sm:min-h-[150px]"
                required
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
