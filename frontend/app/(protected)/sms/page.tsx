"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageSquare, 
  CreditCard, 
  DollarSign, 
  Send, 
  AlertTriangle,
  CheckCircle,
  Phone,
  Wifi,
  WifiOff,
  Calculator,
  Banknote,
  Calendar
} from 'lucide-react'
import { smsService } from '@/lib/sms-service'
import { toast } from 'sonner'
import { SmsBalanceStatus, SmsUsageStats, PublicSmsSettings, PurchaseSmsRequest, SendSmsRequest, PermissionModuleType } from '@/lib/types'
import PermissionGuardPage from '@/components/permission-guard-page'
import PaymentMethodSelector from '@/components/payments/payment-method-selector'
import BkashPayment from '@/components/payments/bkash-payment'
import SslcommerzPayment from '@/components/payments/sslcommerz-payment'

export default function SMSPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.PAYMENTS}>
      <SMSPageContent />
    </PermissionGuardPage>
  )
}

function SMSPageContent() {
  const [balanceStatus, setBalanceStatus] = useState<SmsBalanceStatus | null>(null)
  const [usageStats, setUsageStats] = useState<SmsUsageStats | null>(null)
  const [settings, setSettings] = useState<PublicSmsSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("purchase")
  
  // Purchase state
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseType, setPurchaseType] = useState<'by_count' | 'by_amount'>('by_count')
  const [smsCount, setSmsCount] = useState<number>(100)
  const [amount, setAmount] = useState<number>(50)
  const [purchaseNotes, setPurchaseNotes] = useState<string>('')
  
  // Payment state
  const [showPaymentSelector, setShowPaymentSelector] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'bkash' | 'sslcommerz'>('bkash')
  const [purchaseData, setPurchaseData] = useState<PurchaseSmsRequest | null>(null)
  
  // Send SMS state
  const [sending, setSending] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('transactional')

  useEffect(() => {
    loadSmsData()
  }, [])

  const loadSmsData = async () => {
    try {
      const [statusData, usageData, settingsData] = await Promise.all([
        smsService.getBalanceStatus(),
        smsService.getSmsUsageStats(),
        smsService.getPublicSmsSettings(),
      ])
      
      setBalanceStatus(statusData)
      setUsageStats(usageData)
      setSettings(settingsData)
    } catch (error: any) {
      console.error('Failed to load SMS data:', error)
      toast.error('Failed to load SMS data')
    } finally {
      setLoading(false)
    }
  }

  // Purchase functions
  const calculateAmount = (count: number): number => {
    if (!settings) return 0
    return count * settings.pricePerSms
  }

  const calculateSmsCount = (totalAmount: number): number => {
    if (!settings) return 0
    return Math.floor(totalAmount / settings.pricePerSms)
  }

  const handleSmsCountChange = (value: number) => {
    setSmsCount(value)
    setAmount(calculateAmount(value))
  }

  const handleAmountChange = (value: number) => {
    setAmount(value)
    setSmsCount(calculateSmsCount(value))
  }

  const handlePurchase = async () => {
    if (!settings) return

    const data: PurchaseSmsRequest = {
      type: purchaseType,
      notes: purchaseNotes.trim() || undefined,
    }

    if (purchaseType === 'by_count') {
      if (smsCount < settings.minimumPurchase) {
        toast.error(`Minimum purchase is ${settings.minimumPurchase} SMS`)
        return
      }
      data.smsCount = smsCount
    } else {
      const minAmount = settings.minimumPurchase * settings.pricePerSms
      if (amount < minAmount) {
        toast.error(`Minimum purchase amount is ৳${minAmount.toFixed(2)}`)
        return
      }
      data.amount = amount
    }

    // Store purchase data and show payment method selector
    setPurchaseData(data)
    setShowPaymentSelector(true)
  }

  const handlePaymentMethodSelect = (method: 'bkash' | 'sslcommerz') => {
    setSelectedPaymentMethod(method)
    setShowPaymentSelector(false)
    setShowPayment(true)
  }

  const handlePaymentInitiate = async (data: { 
    planType?: any; 
    payerReference: string;
    paymentMethod?: 'bkash' | 'sslcommerz'
  }) => {
    if (!purchaseData) {
      throw new Error('No purchase data available')
    }

    setPurchasing(true)
    try {
      const result = await smsService.initiatePurchase({
        ...purchaseData,
        paymentMethod: data.paymentMethod || selectedPaymentMethod,
        payerReference: data.payerReference,
      })
      
      if (result.bkashPaymentUrl) {
        return { paymentUrl: result.bkashPaymentUrl }
      } else if (result.sslcommerzPaymentUrl) {
        return { paymentUrl: result.sslcommerzPaymentUrl }
      } else {
        throw new Error('Failed to get payment URL')
      }
    } catch (error: any) {
      console.error('Purchase failed:', error)
      throw error
    } finally {
      setPurchasing(false)
    }
  }

  const handlePaymentSuccess = async () => {
    setShowPayment(false)
    setShowPaymentSelector(false)
    setPurchaseData(null)
    toast.success('SMS purchase completed successfully!')
    
    // Reload SMS data
    await loadSmsData()
    
    // Reset form
    setPurchaseNotes('')
  }

  const handlePaymentCancel = () => {
    setShowPayment(false)
    setShowPaymentSelector(false)
    setPurchaseData(null)
    setSelectedPaymentMethod('bkash')
    setPurchasing(false)
  }

  // Send SMS functions
  const handleSendSms = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!smsService.validatePhoneNumber(recipient)) {
      toast.error('Please enter a valid phone number (e.g., 01712345678)')
      return
    }

    if (!balanceStatus || balanceStatus.balance <= 0) {
      toast.error('Insufficient SMS balance. Please purchase SMS first.')
      return
    }

    const smsCount = smsService.calculateSmsCount(message)
    if (balanceStatus.balance < smsCount) {
      toast.error(`Message requires ${smsCount} SMS but you only have ${balanceStatus.balance} remaining`)
      return
    }

    const smsData: SendSmsRequest = {
      recipient: smsService.formatPhoneNumber(recipient),
      recipientName: recipientName.trim() || undefined,
      message: message.trim(),
      type: messageType,
    }

    setSending(true)
    try {
      const result = await smsService.sendSms(smsData)
      
      if (result.success) {
        toast.success('SMS sent successfully!')
        setRecipient('')
        setRecipientName('')
        setMessage('')
        // Reload balance status
        loadSmsData()
      } else {
        toast.error('Failed to send SMS')
      }
    } catch (error: any) {
      console.error('Send SMS failed:', error)
      toast.error(error.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const getBalanceStatusCard = () => {
    if (!balanceStatus) return null

    const statusConfig = {
      critical: {
        icon: WifiOff,
        iconColor: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-200',
        title: 'Critical',
        description: 'Immediate action required',
      },
      low: {
        icon: AlertTriangle,
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        title: 'Low Balance',
        description: 'Consider recharging soon',
      },
      healthy: {
        icon: Wifi,
        iconColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800',
        textColor: 'text-green-800 dark:text-green-200',
        title: 'Service Active',
        description: 'Balance is healthy',
      },
    }

    const config = statusConfig[balanceStatus.status]
    const Icon = config.icon

    return (
      <Card className={config.bgColor}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <div className="flex items-center gap-1">
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${config.textColor}`}>
            {balanceStatus.balance.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={config.textColor}>
              {config.title}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            SMS remaining
          </p>
        </CardContent>
      </Card>
    )
  }

  const getTodayStatsCard = () => {
    if (!usageStats) return null

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's SMS</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {usageStats.todaySent.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            SMS sent today
          </p>
        </CardContent>
      </Card>
    )
  }

  const getMonthlyStatsCard = () => {
    if (!usageStats) return null

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {usageStats.monthlySent.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            SMS sent this month
          </p>
        </CardContent>
      </Card>
    )
  }

  const getTotalStatsCard = () => {
    if (!usageStats) return null

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          <Send className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {usageStats.totalSent.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Total SMS sent
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusAlert = () => {
    if (!balanceStatus) return null

    if (balanceStatus.status === 'critical') {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Critical: No SMS Balance</div>
            <div className="text-sm mt-1">
              Your SMS balance is critically low. Purchase SMS immediately to continue sending messages.
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    if (balanceStatus.status === 'low') {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Warning: Low SMS Balance</div>
            <div className="text-sm mt-1">
              Your SMS balance is running low. Consider purchasing more SMS to avoid service interruption.
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            SMS service is not available. Please contact administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold">SMS Gateway</h1>
        <p className="text-muted-foreground mt-2">Purchase SMS credits and send messages</p>
      </div>

      {/* Status Alert */}
      {getStatusAlert()}

      {/* SMS Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {getBalanceStatusCard()}
        {getTodayStatsCard()}
        {getMonthlyStatsCard()}
        {getTotalStatsCard()}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Purchase SMS</span>
            <span className="sm:hidden">Purchase</span>
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send SMS</span>
            <span className="sm:hidden">Send</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Purchase SMS Credits
                </CardTitle>
                <CardDescription>
                  Choose your SMS package and pay with bKash
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={purchaseType} onValueChange={(value) => setPurchaseType(value as 'by_count' | 'by_amount')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="by_count" className="text-xs sm:text-sm">By SMS Count</TabsTrigger>
                    <TabsTrigger value="by_amount" className="text-xs sm:text-sm">By Amount</TabsTrigger>
                  </TabsList>

                  <TabsContent value="by_count" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="sms-count">Number of SMS</Label>
                      <Input
                        id="sms-count"
                        type="number"
                        min={settings.minimumPurchase}
                        value={smsCount}
                        onChange={(e) => handleSmsCountChange(parseInt(e.target.value) || 0)}
                        placeholder={`Min ${settings.minimumPurchase}`}
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        ৳{calculateAmount(smsCount).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {smsCount} SMS × ৳{settings.pricePerSms}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="by_amount" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (৳)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min={settings.minimumPurchase * settings.pricePerSms}
                        step="0.01"
                        value={amount}
                        onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                        placeholder={`Min ৳${(settings.minimumPurchase * settings.pricePerSms).toFixed(2)}`}
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {calculateSmsCount(amount).toLocaleString()} SMS
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ৳{amount.toFixed(2)} ÷ ৳{settings.pricePerSms}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="purchase-notes">Notes (Optional)</Label>
                  <Textarea
                    id="purchase-notes"
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    placeholder="Add notes about this purchase..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={purchasing || !settings.isEnabled}
                  className="w-full"
                  size="lg"
                >
                  {purchasing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase SMS
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Pricing Info */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                    <div className="font-bold">৳{settings.pricePerSms}</div>
                    <div className="text-sm text-muted-foreground">Per SMS</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="font-bold">{settings.minimumPurchase}</div>
                    <div className="text-sm text-muted-foreground">Minimum SMS</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• Instant delivery after payment</div>
                  <div>• Secure bKash payment gateway</div>
                  <div>• 24/7 service availability</div>
                  <div>• Automatic balance updates</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="send" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send SMS Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send SMS
                </CardTitle>
                <CardDescription>
                  Send SMS to any number instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Phone Number *</Label>
                  <Input
                    id="recipient"
                    type="tel"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="01712345678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Recipient Name (Optional)</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={4}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{message.length} characters</span>
                    <span>
                      {smsService.calculateSmsCount(message)} SMS 
                      {message.length > 0 && ` (৳${(smsService.calculateSmsCount(message) * (settings?.pricePerSms || 0)).toFixed(2)})`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-type">Message Type</Label>
                  <select
                    id="message-type"
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                    <option value="otp">OTP</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <Button
                  onClick={handleSendSms}
                  disabled={sending || !balanceStatus || balanceStatus.balance <= 0}
                  className="w-full"
                  size="lg"
                >
                  {sending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send SMS
                    </>
                  )}
                </Button>

                {!balanceStatus || balanceStatus.balance <= 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient SMS balance. Please purchase SMS first to send messages.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* SMS Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>SMS Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Character Limits</h4>
                    <p className="text-sm text-muted-foreground">
                      • Standard SMS: 160 characters<br />
                      • Unicode SMS (Bangla): 70 characters<br />
                      • Long messages split automatically
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Phone Number Format</h4>
                    <p className="text-sm text-muted-foreground">
                      • Use 11-digit format: 01712345678<br />
                      • Or with country code: +8801712345678<br />
                      • Supports all BD operators
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Message Types</h4>
                    <p className="text-sm text-muted-foreground">
                      • <strong>Transactional:</strong> Order updates, receipts<br />
                      • <strong>Promotional:</strong> Marketing campaigns<br />
                      • <strong>OTP:</strong> Verification codes<br />
                      • <strong>Reminder:</strong> Appointment alerts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Method Selector Modal */}
      {showPaymentSelector && purchaseData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
            <PaymentMethodSelector
              planName={`${purchaseData.type === 'by_count' ? `${purchaseData.smsCount} SMS` : `৳${purchaseData.amount} Package`}`}
              amount={purchaseData.type === 'by_count' 
                ? calculateAmount(purchaseData.smsCount || 0) 
                : purchaseData.amount || 0}
              onSelectMethod={handlePaymentMethodSelect}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}

      {/* Payment Modal - bKash or SSLCommerz */}
      {showPayment && purchaseData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
            {selectedPaymentMethod === 'bkash' ? (
              <BkashPayment
                planType={undefined as any}
                planName={purchaseData.type === 'by_count' ? `${purchaseData.smsCount} SMS` : `৳${purchaseData.amount} Package`}
                amount={purchaseData.type === 'by_count' 
                  ? calculateAmount(purchaseData.smsCount || 0) 
                  : purchaseData.amount || 0}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                onPaymentInitiate={handlePaymentInitiate}
              />
            ) : (
              <SslcommerzPayment
                planType={undefined as any}
                planName={purchaseData.type === 'by_count' ? `${purchaseData.smsCount} SMS` : `৳${purchaseData.amount} Package`}
                amount={purchaseData.type === 'by_count' 
                  ? calculateAmount(purchaseData.smsCount || 0) 
                  : purchaseData.amount || 0}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                onPaymentInitiate={handlePaymentInitiate}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
