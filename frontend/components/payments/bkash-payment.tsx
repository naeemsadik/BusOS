'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

interface BkashPaymentProps {
  planType: SubscriptionPlan;
  planName: string;
  amount: number;
  onPaymentSuccess: () => void;
  onCancel: () => void;
  onPaymentInitiate: (data: { planType: SubscriptionPlan; payerReference: string }) => Promise<{ paymentUrl: string }>;
}

export default function BkashPayment({
  planType,
  planName,
  amount,
  onPaymentSuccess,
  onCancel,
  onPaymentInitiate,
}: BkashPaymentProps) {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  // Removed loading state
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Get phone number from organization info
  useEffect(() => {
    if (user?.organization?.phone) {
      const orgPhone = user.organization.phone;
      // If starts with 01, add +88 prefix
      if (orgPhone.startsWith('01')) {
        setPhoneNumber(`+88${orgPhone}`);
      } else {
        setPhoneNumber(orgPhone);
      }
    }
  }, [user]);

  const formatPhoneNumber = (phone: string) => {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('880')) {
      return cleaned; // Already in international format
    } else if (cleaned.startsWith('01')) {
      return '880' + cleaned; // Add country code
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '880' + cleaned; // Add country code for 11-digit number starting with 1
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone: string) => {
    const cleaned = formatPhoneNumber(phone);
    return cleaned.length === 13 && cleaned.startsWith('8801');
  };

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your bKash account number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid Bangladeshi mobile number');
      return;
    }

  // Removed loading state
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const result = await onPaymentInitiate({ 
        planType, 
        payerReference: formattedPhone 
      });
      
      setPaymentUrl(result.paymentUrl);
      
      // Redirect to bKash payment URL in the same window
      window.location.href = result.paymentUrl;

    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to initiate payment';
      toast.error(message);
  }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and common formatting characters
    const cleaned = value.replace(/[^\d+\-\s()]/g, '');
    setPhoneNumber(cleaned);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center px-4 sm:px-6">
        <div className="mx-auto mb-3 sm:mb-4 p-2 sm:p-3 bg-pink-100 rounded-full w-fit">
          <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />
        </div>
        <CardTitle className="text-lg sm:text-xl">bKash Payment</CardTitle>
        <CardDescription className="text-sm">
          Complete your subscription purchase securely with bKash
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        {/* Payment Summary */}
        <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
            <span className="font-medium text-sm sm:text-base">{planName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
            <span className="font-bold text-lg sm:text-xl">৳{amount}</span>
          </div>
        </div>

        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm">bKash Account Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="+8801XXXXXXXXX"
              value={phoneNumber}
              onChange={handlePhoneChange}
              className="pl-10 text-sm"
              // Removed loading state
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter your bKash account number (auto-filled from organization info)
          </p>
        </div>

        {/* Payment Instructions */}
        <Alert>
          <AlertDescription className="text-xs sm:text-sm">
            <strong>How it works:</strong>
            <br />
            1. Click "Pay with bKash" to open the payment window
            <br />
            2. Enter your bKash PIN when prompted
            <br />
            3. Confirm the payment amount
            <br />
            4. Your subscription will be activated automatically
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={!phoneNumber.trim()}
            className="flex-1 bg-pink-600 hover:bg-pink-700 text-sm"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Pay with bKash
          </Button>
        </div>

        {/* bKash Branding */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by bKash - Bangladesh's most trusted mobile payment solution
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
