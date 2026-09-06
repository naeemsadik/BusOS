'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Building2 } from 'lucide-react';

interface PaymentMethodSelectorProps {
  planName: string;
  amount: number;
  onSelectMethod: (method: 'bkash' | 'sslcommerz') => void;
  onCancel: () => void;
}

export default function PaymentMethodSelector({
  planName,
  amount,
  onSelectMethod,
  onCancel,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'sslcommerz'>('bkash');

  const handleContinue = () => {
    onSelectMethod(selectedMethod);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center px-4 sm:px-6">
        <div className="mx-auto mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-100 rounded-full w-fit">
          <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
        </div>
        <CardTitle className="text-lg sm:text-xl">Choose Payment Method</CardTitle>
        <CardDescription className="text-sm">
          Select your preferred payment method to continue
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

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Payment Gateway</Label>
          <RadioGroup value={selectedMethod} onValueChange={(value: string) => setSelectedMethod(value as 'bkash' | 'sslcommerz')}>
            {/* bKash Option */}
            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <RadioGroupItem value="bkash" id="bkash" />
              <label htmlFor="bkash" className="flex items-center flex-1 cursor-pointer">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">bKash</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Mobile payment solution</div>
                  </div>
                </div>
              </label>
            </div>

            {/* SSLCommerz Option */}
            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <RadioGroupItem value="sslcommerz" id="sslcommerz" />
              <label htmlFor="sslcommerz" className="flex items-center flex-1 cursor-pointer">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">SSLCommerz</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Card, Mobile Banking & More
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Payment Method Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {selectedMethod === 'bkash' ? (
              <>
                <strong>bKash:</strong> Quick mobile payment using your bKash account
              </>
            ) : (
              <>
                <strong>SSLCommerz:</strong> Supports credit/debit cards, mobile banking (bKash, Nagad, Rocket), and internet banking
              </>
            )}
          </p>
        </div>

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
            onClick={handleContinue}
            className="flex-1 text-sm"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
