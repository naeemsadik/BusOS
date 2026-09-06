"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CreditCard, 
  DollarSign, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Banknote,
  Calculator
} from 'lucide-react';
import { smsService } from '@/lib/sms-service';
import { toast } from 'sonner';
import { SmsBalanceStatus, PublicSmsSettings, PurchaseSmsRequest } from '@/lib/types';

export default function SmsPurchasePage() {
  const [balanceStatus, setBalanceStatus] = useState<SmsBalanceStatus | null>(null);
  const [settings, setSettings] = useState<PublicSmsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  // Purchase form state
  const [purchaseType, setPurchaseType] = useState<'by_count' | 'by_amount'>('by_count');
  const [smsCount, setSmsCount] = useState<number>(100);
  const [amount, setAmount] = useState<number>(50);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [statusData, settingsData] = await Promise.all([
        smsService.getBalanceStatus(),
        smsService.getPublicSmsSettings(),
      ]);
      
      setBalanceStatus(statusData);
      setSettings(settingsData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = (count: number): number => {
    if (!settings) return 0;
    return count * settings.pricePerSms;
  };

  const calculateSmsCount = (totalAmount: number): number => {
    if (!settings) return 0;
    return Math.floor(totalAmount / settings.pricePerSms);
  };

  const handleSmsCountChange = (value: number) => {
    setSmsCount(value);
    setAmount(calculateAmount(value));
  };

  const handleAmountChange = (value: number) => {
    setAmount(value);
    setSmsCount(calculateSmsCount(value));
  };

  const handlePurchase = async () => {
    if (!settings) return;

    const purchaseData: PurchaseSmsRequest = {
      type: purchaseType,
      notes: notes.trim() || undefined,
    };

    if (purchaseType === 'by_count') {
      if (smsCount < settings.minimumPurchase) {
        toast.error(`Minimum purchase is ${settings.minimumPurchase} SMS`);
        return;
      }
      purchaseData.smsCount = smsCount;
    } else {
      const minAmount = settings.minimumPurchase * settings.pricePerSms;
      if (amount < minAmount) {
        toast.error(`Minimum purchase amount is ৳${minAmount.toFixed(2)}`);
        return;
      }
      purchaseData.amount = amount;
    }

    setPurchasing(true);
    try {
      const result = await smsService.initiatePurchase(purchaseData);
      
      if (result.bkashPaymentUrl) {
        // Redirect to bKash payment page
        window.open(result.bkashPaymentUrl, '_blank');
        toast.success('Redirecting to bKash payment...');
      } else {
        toast.error('Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      toast.error(error.message || 'Failed to initiate purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const getStatusAlert = () => {
    if (!balanceStatus) return null;

    const alertConfig = {
      critical: {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        title: 'Critical: No SMS Balance',
        description: 'Your SMS balance is critically low. Purchase SMS immediately to continue sending messages.',
      },
      low: {
        variant: 'default' as const,
        icon: AlertTriangle,
        title: 'Warning: Low SMS Balance',
        description: 'Your SMS balance is running low. Consider purchasing more SMS to avoid service interruption.',
      },
      healthy: {
        variant: 'default' as const,
        icon: CheckCircle,
        title: 'SMS Balance Healthy',
        description: 'Your SMS balance is sufficient for continued messaging services.',
      },
    };

    const config = alertConfig[balanceStatus.status];
    const Icon = config.icon;

    return (
      <Alert variant={config.variant} className="mb-6">
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium">{config.title}</div>
          <div className="text-sm mt-1">{config.description}</div>
          <div className="text-sm mt-2">
            <strong>Current Balance:</strong> {balanceStatus.balance.toLocaleString()} SMS
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Purchase SMS</h1>
        <p className="text-gray-600">Buy SMS credits for your messaging needs</p>
      </div>

      {/* Status Alert */}
      {getStatusAlert()}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balanceStatus?.balance.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">SMS remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price per SMS</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{settings.pricePerSms}</div>
            <p className="text-xs text-muted-foreground">Per message</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minimum Purchase</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.minimumPurchase}</div>
            <p className="text-xs text-muted-foreground">SMS minimum</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase SMS Credits
          </CardTitle>
          <CardDescription>
            Choose how you want to purchase SMS credits and complete payment via bKash
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={purchaseType} onValueChange={(value) => setPurchaseType(value as 'by_count' | 'by_amount')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="by_count" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                By SMS Count
              </TabsTrigger>
              <TabsTrigger value="by_amount" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                By Amount
              </TabsTrigger>
            </TabsList>

            <TabsContent value="by_count" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="sms-count">Number of SMS</Label>
                <Input
                  id="sms-count"
                  type="number"
                  min={settings.minimumPurchase}
                  value={smsCount}
                  onChange={(e) => handleSmsCountChange(parseInt(e.target.value) || 0)}
                  placeholder={`Minimum ${settings.minimumPurchase} SMS`}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum: {settings.minimumPurchase} SMS
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    ৳{calculateAmount(smsCount).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {smsCount} SMS × ৳{settings.pricePerSms} = ৳{calculateAmount(smsCount).toFixed(2)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="by_amount" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (৳)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={settings.minimumPurchase * settings.pricePerSms}
                  step="0.01"
                  value={amount}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder={`Minimum ৳${(settings.minimumPurchase * settings.pricePerSms).toFixed(2)}`}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum: ৳{(settings.minimumPurchase * settings.pricePerSms).toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">SMS Count:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {calculateSmsCount(amount).toLocaleString()} SMS
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  ৳{amount.toFixed(2)} ÷ ৳{settings.pricePerSms} = {calculateSmsCount(amount)} SMS
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this purchase..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handlePurchase}
                disabled={
                  purchasing ||
                  !settings.isEnabled ||
                  (purchaseType === 'by_count' && smsCount < settings.minimumPurchase) ||
                  (purchaseType === 'by_amount' && amount < settings.minimumPurchase * settings.pricePerSms)
                }
                className="flex-1"
                size="lg"
              >
                {purchasing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with bKash
                  </>
                )}
              </Button>
            </div>
          </div>

          {!settings.isEnabled && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                SMS service is currently disabled. Please contact administrator.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Choose your SMS package</p>
                <p className="text-sm text-muted-foreground">
                  Select either by SMS count or by amount above
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Click "Pay with bKash"</p>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to the bKash payment gateway
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Complete payment</p>
                <p className="text-sm text-muted-foreground">
                  Follow the bKash instructions to complete your payment
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">SMS credits added automatically</p>
                <p className="text-sm text-muted-foreground">
                  Once payment is confirmed, SMS credits will be added to your account and expenses recorded
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
