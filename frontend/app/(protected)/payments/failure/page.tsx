'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    // Support both bKash (paymentID) and SSLCommerz (tran_id) parameters
    const paymentIdParam = searchParams.get('paymentID') || searchParams.get('tran_id');
    const errorParam = searchParams.get('error');
    const methodParam = searchParams.get('paymentMethod');
    
    setPaymentId(paymentIdParam);
    setError(errorParam);
    setPaymentMethod(methodParam);

    // Auto redirect after 10 seconds
    const timer = setTimeout(() => {
      router.push('/subscription');
    }, 10000);

    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Payment Failed ❌
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Unfortunately, your payment could not be processed. Please try again.
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600">
              Error: {error}
            </p>
          )}
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
            <p>Need help? Contact support or try again later.</p>
            <p className="mt-2">Redirecting to subscription page in 10 seconds...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
