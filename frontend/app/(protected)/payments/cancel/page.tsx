'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    // Support both bKash (paymentID) and SSLCommerz (tran_id) parameters
    const paymentIdParam = searchParams.get('paymentID') || searchParams.get('tran_id');
    const methodParam = searchParams.get('paymentMethod');
    
    setPaymentId(paymentIdParam);
    setPaymentMethod(methodParam);

    // Auto redirect after 7 seconds
    const timer = setTimeout(() => {
      router.push('/subscription');
    }, 7000);

    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Payment Cancelled ⚠️
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            You have cancelled the payment process. No charges have been made to your account.
          </p>
          {paymentId && (
            <p className="mt-2 text-xs text-gray-500">
              {paymentMethod === 'sslcommerz' ? 'Transaction ID' : 'Payment ID'}: {paymentId}
            </p>
          )}
          {paymentMethod && (
            <p className="mt-1 text-xs text-gray-500">
              Payment Method: {paymentMethod === 'sslcommerz' ? 'SSLCommerz' : 'bKash'}
            </p>
          )}
          <div className="mt-6 space-y-3">
            <Link
              href="/subscription"
              className="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </Link>
            <Link
              href="/dashboard"
              className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Dashboard
            </Link>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>You can always try to purchase a subscription later.</p>
            <p className="mt-2">Redirecting to subscription page in 7 seconds...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
