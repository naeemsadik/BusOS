'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

interface SslcommerzPaymentProps {
  planType: SubscriptionPlan;
  planName: string;
  amount: number;
  onPaymentSuccess: () => void;
  onCancel: () => void;
  onPaymentInitiate: (data: { planType: SubscriptionPlan; payerReference: string; paymentMethod: 'sslcommerz' }) => Promise<{ paymentUrl: string }>;
}

export default function SslcommerzPayment({
  planType,
  planName,
  amount,
  onPaymentSuccess,
  onCancel,
  onPaymentInitiate,
}: SslcommerzPaymentProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Get email and phone from user/organization info
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.organization?.phone) {
      const orgPhone = user.organization.phone;
      // If starts with 01, add +88 prefix
      if (orgPhone.startsWith('01')) {
        setPhone(`+88${orgPhone}`);
      } else {
        setPhone(orgPhone);
      }
    }
  }, [user]);

  const formatPhoneNumber = (phoneNumber: string) => {
    // Remove non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
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

  const validateEmail = (emailAddress: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailAddress);
  };

  const validatePhoneNumber = (phoneNumber: string) => {
    const cleaned = formatPhoneNumber(phoneNumber);
    return cleaned.length === 13 && cleaned.startsWith('8801');
  };

  const handlePayment = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phone)) {
      toast.error('Please enter a valid Bangladeshi mobile number');
      return;
    }

    try {
      // Use email as payer reference for SSLCommerz
      const result = await onPaymentInitiate({ 
        planType, 
        payerReference: email,
        paymentMethod: 'sslcommerz'
      });
      
      setPaymentUrl(result.paymentUrl);
      
      // Redirect to SSLCommerz payment URL
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
    setPhone(cleaned);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center px-4 sm:px-6">
        <div className="mx-auto mb-3 sm:mb-4 p-2 sm:p-3 bg-green-100 rounded-full w-fit">
          <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
        </div>
        <CardTitle className="text-lg sm:text-xl">SSLCommerz Payment</CardTitle>
        <CardDescription className="text-sm">
          Complete your subscription purchase securely with SSLCommerz
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

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payment confirmation will be sent to this email
          </p>
        </div>

        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="+8801XXXXXXXXX"
              value={phone}
              onChange={handlePhoneChange}
              className="pl-10 text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your contact number (auto-filled from organization info)
          </p>
        </div>

        {/* Payment Methods Info */}
        <Alert>
          <AlertDescription className="text-xs sm:text-sm">
            <strong>SSLCommerz supports:</strong>
            <br />
            • Credit/Debit Cards (Visa, MasterCard, Amex)
            <br />
            • Mobile Banking (bKash, Nagad, Rocket, Upay)
            <br />
            • Internet Banking
            <br />
            <br />
            You'll be able to choose your preferred method on the next page.
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
            disabled={!email.trim() || !phone.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Pay with SSLCommerz
          </Button>
        </div>

        {/* SSLCommerz Branding */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by SSLCommerz - Bangladesh's largest payment gateway
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
