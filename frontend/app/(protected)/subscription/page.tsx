'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, Check, Loader2, CreditCard, Calendar, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { subscriptionService } from '@/lib/subscription-service';
import { formatLocalDate } from '@/lib/date-utils';
import { SubscriptionPlan, SubscriptionStatus, UserRole } from '@/lib/types';
import { toast } from 'sonner';
import BkashPayment from '@/components/payments/bkash-payment';
import SslcommerzPayment from '@/components/payments/sslcommerz-payment';
import PaymentMethodSelector from '@/components/payments/payment-method-selector';
import PaymentHistory from '@/components/subscription/payment-history';

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'bkash' | 'sslcommerz'>('bkash');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
    loadPaymentHistory();
    
    // Check if user came from payment success
    const fromPayment = searchParams.get('from');
    if (fromPayment === 'payment-success') {
      // Show success message and refresh data after a short delay
      toast.success('Payment successful! Your subscription has been updated.');
      setTimeout(() => {
        loadSubscriptionData();
        loadPaymentHistory();
      }, 1000);
      
      // Clean up URL parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, []);
  
  // Also refresh when page becomes visible (user switching tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSubscriptionData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const [subscriptionData, plansData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPlans(),
      ]);

      
      setSubscription(subscriptionData);
      setPlans(plansData.plans);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load subscription data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const payments = await subscriptionService.getPaymentHistory();
      setPaymentHistory(payments);
    } catch (error: any) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleUpgrade = (planType: SubscriptionPlan) => {
    if (user?.role !== UserRole.OWNER) {
      toast.error('Only organization owners can manage subscriptions');
      return;
    }

    const plan = plans.find(p => p.planType === planType);
    if (!plan) {
      toast.error('Plan not found');
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentSelector(true);
  };

  const handlePaymentMethodSelect = (method: 'bkash' | 'sslcommerz') => {
    setSelectedPaymentMethod(method);
    setShowPaymentSelector(false);
    setShowPayment(true);
  };

  const handlePaymentInitiate = async (data: { 
    planType: SubscriptionPlan; 
    payerReference: string; 
    paymentMethod?: 'bkash' | 'sslcommerz' 
  }) => {
    const result = await subscriptionService.purchaseSubscription(data);
    return { paymentUrl: result.paymentUrl };
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setSelectedPlan(null);
    toast.success('Subscription purchased successfully!');
    await loadSubscriptionData();
    await loadPaymentHistory();
    await refreshUser();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setShowPaymentSelector(false);
    setSelectedPlan(null);
    setSelectedPaymentMethod('bkash');
  };


  const handleRenew = async () => {
    if (user?.role !== UserRole.OWNER) {
      toast.error('Only organization owners can manage subscriptions');
      return;
    }

    try {
      await subscriptionService.renewSubscription();
      toast.success('Subscription renewed successfully!');
      await loadSubscriptionData();
      await refreshUser();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to renew subscription';
      toast.error(message);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants = {
      [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800',
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SubscriptionStatus.EXPIRED]: 'bg-red-100 text-red-800',
      [SubscriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [SubscriptionStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || SubscriptionPlan.TRIAL;
  const daysRemaining = subscription ? getDaysRemaining(subscription.endDate) : 0;
  const isExpired = subscription?.status === SubscriptionStatus.EXPIRED;
  const isCancelled = subscription?.status === SubscriptionStatus.CANCELLED;

  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Subscription Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your subscription plan and billing</p>
        </div>

        {/* Current Subscription Status */}
        <Card className="mb-6 sm:mb-8 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Crown className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan</Label>
                    <p className="text-lg font-semibold capitalize dark:text-gray-100">{subscription.plan}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(subscription.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</Label>
                    <p className="text-lg font-semibold dark:text-gray-100">
                      ৳{plans.find(p => p.planType === subscription.plan)?.price || 0}/{subscription.plan === SubscriptionPlan.TRIAL ? 'trial' : 'month'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</Label>
                    <p className="text-sm dark:text-gray-100">{new Date(subscription.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</Label>
                    <p className="text-sm dark:text-gray-100">{new Date(subscription.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Days Remaining</Label>
                    <p className={`text-sm font-medium ${daysRemaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{daysRemaining} days</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No active subscription found</p>
            )}

            {/* Alerts */}
            {subscription && daysRemaining <= 3 && !isCancelled && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription expires in {daysRemaining} days. 
                  {subscription.autoRenew ? ' It will auto-renew.' : ' Please renew to continue service.'}
                </AlertDescription>
              </Alert>
            )}

            {isExpired && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription has expired. Please renew or upgrade to continue using the service.
                </AlertDescription>
              </Alert>
            )}

            {isCancelled && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription has been cancelled and will end on {formatLocalDate(subscription.endDate)}.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {user?.role === UserRole.OWNER && subscription && (
              <div className="mt-6 flex gap-2">
                {(isExpired || isCancelled) && (
                  <Button onClick={handleRenew}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Renew Subscription
                  </Button>
                )}
              </div>
            )}

            {user?.role !== UserRole.OWNER && (
              <Alert className="mt-4">
                <AlertDescription>
                  Only organization owners can manage subscriptions. Contact your organization owner to make changes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.planType} 
                className={`relative bg-white dark:bg-gray-900 ${plan.isPopular ? 'ring-2 ring-blue-500' : ''} ${currentPlan === plan.planType ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Recommended</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between dark:text-gray-100">
                    {plan.name}
                    {currentPlan === plan.planType && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold dark:text-gray-100">৳{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400">/{plan.planType === SubscriptionPlan.TRIAL ? 'trial' : 'month'}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm dark:text-gray-100">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {user?.role === UserRole.OWNER && (
                    <Button
                      className="w-full"
                      disabled={
                        currentPlan === plan.planType || 
                        upgrading === plan.planType ||
                        plan.planType === SubscriptionPlan.TRIAL
                      }
                      onClick={() => handleUpgrade(plan.planType)}
                    >
                      {upgrading === plan.planType ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Upgrading...
                        </>
                      ) : currentPlan === plan.planType ? (
                        'Current Plan'
                      ) : plan.planType === SubscriptionPlan.TRIAL ? (
                        'Trial Plan'
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Upgrade
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment History Section */}
        <div className="mb-6 sm:mb-8">
          <PaymentHistory payments={paymentHistory} loading={loadingPayments} />
        </div>

        {/* Payment Method Selector Modal */}
        {showPaymentSelector && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
              <PaymentMethodSelector
                planName={selectedPlan.name}
                amount={selectedPlan.price}
                onSelectMethod={handlePaymentMethodSelect}
                onCancel={handlePaymentCancel}
              />
            </div>
          </div>
        )}

        {/* Payment Modal - bKash or SSLCommerz */}
        {showPayment && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
              {selectedPaymentMethod === 'bkash' ? (
                <BkashPayment
                  planType={selectedPlan.planType}
                  planName={selectedPlan.name}
                  amount={selectedPlan.price}
                  onPaymentSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                  onPaymentInitiate={handlePaymentInitiate}
                />
              ) : (
                <SslcommerzPayment
                  planType={selectedPlan.planType}
                  planName={selectedPlan.name}
                  amount={selectedPlan.price}
                  onPaymentSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                  onPaymentInitiate={handlePaymentInitiate}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium text-gray-700 dark:text-gray-400 ${className}`}>{children}</label>;
}
