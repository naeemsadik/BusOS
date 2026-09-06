'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PaymentsService } from '@/lib/payments-service';

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await PaymentsService.getPayments();
      setPayments(data);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load payments data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRefund = async (paymentId: string) => {
    try {
      await PaymentsService.refundPayment(paymentId);
      toast.success('Payment refunded successfully!');
      await loadPayments();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to refund payment';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Manage and review payment transactions</p>
        </div>

        {payments.map((payment) => (
          <Card key={payment.id} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Payment ID: {payment.id}
                <span className="text-sm font-medium text-gray-500">{payment.status}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-2">
                <div className="font-medium">Amount:</div>
                <div className="col-span-3">৳{payment.amount}</div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-2">
                <div className="font-medium">Payer:</div>
                <div className="col-span-3">{payment.payerReference}</div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-2">
                <div className="font-medium">Transaction ID:</div>
                <div className="col-span-3">{payment.trxId || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-2">
                <div className="font-medium">Time:</div>
                <div className="col-span-3">{new Date(payment.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-4">
                <Button className="bg-red-500 hover:bg-red-600" onClick={() => handlePaymentRefund(payment.id)}>
                  Refund
                </Button>
              </div>

              {payment.status === 'REFUNDED' && (
                <Alert className="mt-4">
                  <AlertDescription className="text-sm">
                    This payment has already been refunded.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

