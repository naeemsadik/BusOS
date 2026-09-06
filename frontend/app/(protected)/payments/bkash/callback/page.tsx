'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface CallbackStatus {
  paymentID?: string;
  status?: string;
  signature?: string;
  apiVersion?: string;
  error?: string;
}

function BkashCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [callbackData, setCallbackData] = useState<CallbackStatus>({});
  const [processing, setProcessing] = useState(true);
  const [finalStatus, setFinalStatus] = useState<'success' | 'failure' | 'pending'>('pending');

  useEffect(() => {
    const data: CallbackStatus = {
      paymentID: searchParams.get('paymentID') || undefined,
      status: searchParams.get('status') || undefined,
      signature: searchParams.get('signature') || undefined,
      apiVersion: searchParams.get('apiVersion') || undefined,
      error: searchParams.get('error') || undefined,
    };

    setCallbackData(data);

    // Process the callback
    processCallback(data);
  }, [searchParams]);

  const processCallback = async (data: CallbackStatus) => {
    console.log('🔄 Processing bKash callback:', data);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (data.status === 'success') {
        setFinalStatus('success');
        // Auto redirect to success page after 3 seconds
        setTimeout(() => {
          router.push(`/payments/success?paymentID=${data.paymentID}&status=success`);
        }, 3000);
      } else if (data.status === 'failure' || data.error) {
        setFinalStatus('failure');
        // Auto redirect to failure page after 5 seconds
        setTimeout(() => {
          router.push(`/payments/failure?paymentID=${data.paymentID}&error=${encodeURIComponent(data.error || 'Payment failed')}`);
        }, 5000);
      } else {
        // Unknown status, treat as failure
        setFinalStatus('failure');
        setTimeout(() => {
          router.push(`/payments/failure?paymentID=${data.paymentID}&error=${encodeURIComponent('Unknown payment status')}`);
        }, 5000);
      }
    } catch (error) {
      console.error('❌ Error processing callback:', error);
      setFinalStatus('failure');
      setTimeout(() => {
        router.push(`/payments/failure?paymentID=${data.paymentID}&error=${encodeURIComponent('Processing error')}`);
      }, 5000);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = () => {
    if (processing) {
      return (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (finalStatus === 'success') {
      return (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    return (
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
    );
  };

  const getStatusTitle = () => {
    if (processing) {
      return 'Processing Payment...';
    }
    if (finalStatus === 'success') {
      return 'Payment Processing Complete!';
    }
    return 'Payment Processing Failed';
  };

  const getStatusMessage = () => {
    if (processing) {
      return 'Please wait while we process your bKash payment. This may take a few moments.';
    }
    if (finalStatus === 'success') {
      return 'Your payment has been successfully processed. You will be redirected to the success page shortly.';
    }
    return 'There was an issue processing your payment. You will be redirected to try again.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {getStatusIcon()}
          
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            {getStatusTitle()}
          </h1>
          
          <p className="mt-2 text-sm text-gray-600">
            {getStatusMessage()}
          </p>

          {/* Payment Details */}
          {callbackData.paymentID && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Payment ID:</span> {callbackData.paymentID}
                </div>
                {callbackData.status && (
                  <div>
                    <span className="font-medium">Status:</span> {callbackData.status}
                  </div>
                )}
                {callbackData.signature && (
                  <div>
                    <span className="font-medium">Signature:</span> {callbackData.signature}
                  </div>
                )}
                {callbackData.apiVersion && (
                  <div>
                    <span className="font-medium">API Version:</span> {callbackData.apiVersion}
                  </div>
                )}
                {callbackData.error && (
                  <div className="text-red-600">
                    <span className="font-medium">Error:</span> {callbackData.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Status */}
          {processing && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-blue-600">
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.2s' }}></div>
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}

          {/* Manual Navigation Buttons (shown after processing) */}
          {!processing && (
            <div className="mt-6 space-y-3">
              {finalStatus === 'success' ? (
                <>
                  <Link
                    href={`/payments/success?paymentID=${callbackData.paymentID}&status=success`}
                    className="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Continue to Success Page
                  </Link>
                  <Link
                    href="/subscription"
                    className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    View Subscription
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={`/payments/failure?paymentID=${callbackData.paymentID}&error=${encodeURIComponent(callbackData.error || 'Payment failed')}`}
                    className="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    View Error Details
                  </Link>
                  <Link
                    href="/subscription"
                    className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Try Again
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Auto-redirect notice */}
          {!processing && (
            <p className="mt-4 text-xs text-gray-500">
              {finalStatus === 'success' 
                ? 'Auto-redirecting in 3 seconds...' 
                : 'Auto-redirecting in 5 seconds...'
              }
            </p>
          )}

          {/* bKash Branding */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Powered by <span className="font-medium text-pink-600">bKash</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BkashCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">
              Loading...
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we load the payment callback.
            </p>
          </div>
        </div>
      </div>
    }>
      <BkashCallbackContent />
    </Suspense>
  );
}
