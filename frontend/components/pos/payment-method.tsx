"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Banknote, Smartphone, Settings, Truck } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrderDetails } from "./types"

interface PaymentMethodProps {
  orderDetails: OrderDetails
  onUpdateOrderDetails: (details: Partial<OrderDetails>) => void
}

export function PaymentMethod({
  orderDetails,
  onUpdateOrderDetails
}: PaymentMethodProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const handleSavePaymentMethod = () => {
    setShowPaymentDialog(false)
  }

  const handlePaymentMethodSelect = (method: "cash" | "card" | "mobile" | "delivery_partner" | "cod") => {
    onUpdateOrderDetails({ 
      paymentMethod: method,
      // Clear transaction ID and providers if switching to cash, COD, or delivery partner
      transactionId: (method === "cash" || method === "delivery_partner" || method === "cod") ? "" : orderDetails.transactionId,
      mobileProvider: method === "mobile" ? orderDetails.mobileProvider : "",
      cardType: method === "card" ? orderDetails.cardType : ""
    })
  }

  const getPaymentMethodDisplay = () => {
    switch (orderDetails.paymentMethod) {
      case "cash":
        return "Cash Payment"
      case "card":
        return "Card Payment"
      case "mobile":
        return "Mobile Payment"
      case "delivery_partner":
        return "Via Delivery Partner"
      case "cod":
        return "Cash on Delivery"
      default:
        return "Select Payment Method"
    }
  }

  const getPaymentMethodIcon = () => {
    switch (orderDetails.paymentMethod) {
      case "cash":
        return <Banknote className="w-4 h-4" />
      case "card":
        return <CreditCard className="w-4 h-4" />
      case "mobile":
        return <Smartphone className="w-4 h-4" />
      case "delivery_partner":
        return <Truck className="w-4 h-4" />
      case "cod":
        return <Banknote className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const requiresTransactionId = orderDetails.paymentMethod === "card" || orderDetails.paymentMethod === "mobile"

  return (
    <div className="space-y-3">
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-between text-sm sm:text-base h-10 sm:h-11">
            <div className="flex items-center gap-2">
              {getPaymentMethodIcon()}
              <span className="truncate">{getPaymentMethodDisplay()}</span>
            </div>
            <span className="text-xs text-muted-foreground">*</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Side - Payment Method Selection */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm sm:text-base">Select Payment Method</h3>
              <div className="grid gap-2 sm:gap-3">
                <Button
                  variant={orderDetails.paymentMethod === "cash" ? "default" : "outline"}
                  className="h-auto p-3 sm:p-4 justify-start text-left"
                  onClick={() => handlePaymentMethodSelect("cash")}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Banknote className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">Cash Payment</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Pay with cash at checkout</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant={orderDetails.paymentMethod === "card" ? "default" : "outline"}
                  className="h-auto p-3 sm:p-4 justify-start text-left"
                  onClick={() => handlePaymentMethodSelect("card")}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">Card Payment</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Credit or debit card</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant={orderDetails.paymentMethod === "mobile" ? "default" : "outline"}
                  className="h-auto p-3 sm:p-4 justify-start text-left"
                  onClick={() => handlePaymentMethodSelect("mobile")}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">Mobile Payment</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">bKash, Nagad, Rocket, Upay</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant={orderDetails.paymentMethod === "delivery_partner" ? "default" : "outline"}
                  className="h-auto p-3 sm:p-4 justify-start text-left"
                  onClick={() => handlePaymentMethodSelect("delivery_partner")}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">Via Delivery Partner</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Payment through delivery service</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant={orderDetails.paymentMethod === "cod" ? "default" : "outline"}
                  className="h-auto p-3 sm:p-4 justify-start text-left"
                  onClick={() => handlePaymentMethodSelect("cod")}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Banknote className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">Cash on Delivery</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Pay when package is delivered</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Right Side - Payment Details */}
            <div className="space-y-4">
              {requiresTransactionId && (
                <>
                  <h3 className="font-medium text-sm sm:text-base">Payment Details</h3>
                  
                  {/* Mobile Banking Provider Selection */}
                  {orderDetails.paymentMethod === "mobile" && (
                    <div className="space-y-2">
                      <Label htmlFor="mobile-provider" className="text-sm">Mobile Banking Provider *</Label>
                      <Select 
                        value={orderDetails.mobileProvider} 
                        onValueChange={(value) => onUpdateOrderDetails({ mobileProvider: value as "bkash" | "nagad" | "rocket" | "upay" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mobile banking provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bkash">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-pink-500 rounded"></div>
                              bKash
                            </div>
                          </SelectItem>
                          <SelectItem value="nagad">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded"></div>
                              Nagad
                            </div>
                          </SelectItem>
                          <SelectItem value="rocket">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded"></div>
                              Rocket
                            </div>
                          </SelectItem>
                          <SelectItem value="upay">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
                              Upay
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Card Type Selection */}
                  {orderDetails.paymentMethod === "card" && (
                    <div className="space-y-2">
                      <Label htmlFor="card-type" className="text-sm">Card Type *</Label>
                      <Select 
                        value={orderDetails.cardType} 
                        onValueChange={(value) => onUpdateOrderDetails({ cardType: value as "visa" | "mastercard" | "amex" | "other" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visa">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-600 rounded"></div>
                              Visa
                            </div>
                          </SelectItem>
                          <SelectItem value="mastercard">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
                              Mastercard
                            </div>
                          </SelectItem>
                          <SelectItem value="amex">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
                              American Express
                            </div>
                          </SelectItem>
                          <SelectItem value="other">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-500 rounded"></div>
                              Other
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Transaction ID Input */}
                  <div className="space-y-2">
                    <Label htmlFor="transaction-id" className="text-sm">
                      Transaction ID *
                      {orderDetails.paymentMethod === "mobile" && orderDetails.mobileProvider && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({orderDetails.mobileProvider.charAt(0).toUpperCase() + orderDetails.mobileProvider.slice(1)} TxnID)
                        </span>
                      )}
                      {orderDetails.paymentMethod === "card" && orderDetails.cardType && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({orderDetails.cardType.charAt(0).toUpperCase() + orderDetails.cardType.slice(1)} Transaction ID)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="transaction-id"
                      placeholder={
                        orderDetails.paymentMethod === "mobile" 
                          ? `Enter ${orderDetails.mobileProvider || "mobile banking"} transaction ID`
                          : `Enter ${orderDetails.cardType || "card"} transaction ID`
                      }
                      value={orderDetails.transactionId || ""}
                      onChange={(e) => onUpdateOrderDetails({ transactionId: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Transaction Summary */}
                  {orderDetails.transactionId && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium">Transaction Summary</div>
                        <div className="mt-1 space-y-1">
                          {orderDetails.paymentMethod === "mobile" && orderDetails.mobileProvider && (
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground">Provider:</span>
                              <span className="capitalize">{orderDetails.mobileProvider}</span>
                            </div>
                          )}
                          {orderDetails.paymentMethod === "card" && orderDetails.cardType && (
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground">Card Type:</span>
                              <span className="capitalize">{orderDetails.cardType}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">Transaction ID:</span>
                            <span className="font-mono break-all">{orderDetails.transactionId}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!requiresTransactionId && orderDetails.paymentMethod && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">{getPaymentMethodDisplay()}</div>
                    <div className="text-muted-foreground mt-1 text-xs sm:text-sm">
                      {orderDetails.paymentMethod === "cash" && "No additional details required"}
                      {orderDetails.paymentMethod === "delivery_partner" && "Payment will be collected by delivery partner"}
                      {orderDetails.paymentMethod === "cod" && "Payment will be collected upon delivery"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSavePaymentMethod} 
              className="w-full lg:w-auto"
              disabled={
                !orderDetails.paymentMethod || 
                (orderDetails.paymentMethod === "mobile" && (!orderDetails.mobileProvider || !orderDetails.transactionId?.trim())) ||
                (orderDetails.paymentMethod === "card" && (!orderDetails.cardType || !orderDetails.transactionId?.trim()))
              }
            >
              Save Payment Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Display */}
      {orderDetails.paymentMethod && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPaymentMethodIcon()}
              <span className="font-medium text-sm">{getPaymentMethodDisplay()}</span>
              {orderDetails.paymentMethod === "mobile" && orderDetails.mobileProvider && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">
                  {orderDetails.mobileProvider}
                </span>
              )}
              {orderDetails.paymentMethod === "card" && orderDetails.cardType && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">
                  {orderDetails.cardType}
                </span>
              )}
            </div>
            {requiresTransactionId && orderDetails.transactionId && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Transaction ID</div>
                <div className="text-sm font-mono">{orderDetails.transactionId}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
