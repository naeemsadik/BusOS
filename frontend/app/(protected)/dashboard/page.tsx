'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Crown,
  AlertTriangle,
  Settings,
  ShoppingCart,
  Percent,
  ArrowUpDown,
  Wallet,
  BadgeDollarSign,
  AudioLines
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmailVerificationBanner } from '@/components/email-verification-banner';
import { useAuth } from '@/contexts/auth-context';
import { subscriptionService } from '@/lib/subscription-service';
import { dashboardService, DashboardStats, RecentActivity } from '@/lib/dashboard-service';
import { SubscriptionStatus, UserRole, PermissionModuleType } from '@/lib/types';
import { posService, PosStats } from '@/lib/pos-service';
import { SalesChart } from '@/components/charts/sales-chart';
import PermissionGuardPage from '@/components/permission-guard-page';
import { useCurrency } from '@/contexts/currency-context';
import { VoiceCommandDialog } from '@/components/voice/voice-command-dialog';

export default function DashboardPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.DASHBOARD}>
      <DashboardPageContent />
    </PermissionGuardPage>
  )
}

function DashboardPageContent() {
  const { user, refreshUser } = useAuth();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [salesPerformance, setSalesPerformance] = useState<PosStats | null>(null);
  const [loadingSalesData, setLoadingSalesData] = useState(true);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      // Load initial data only once when user is available
      loadSubscriptionStatus();
      loadDashboardData();
      loadSalesPerformanceData();
    }
  }, [user]);

  // Use refs to track last load time to prevent excessive API calls
  const lastSubscriptionLoadRef = useRef<number>(0);
  const lastDashboardLoadRef = useRef<number>(0);
  const lastSalesLoadRef = useRef<number>(0);
  const minTimeBetweenLoads = 5000; // 5 seconds minimum between loads
  
  const loadSubscriptionStatus = async () => {
    // Check if enough time has passed since last load
    const now = Date.now();
    if (now - lastSubscriptionLoadRef.current < minTimeBetweenLoads && !loadingSubscription) {
      return; // Skip this load if it's too soon after the last one
    }
    
    try {
      setLoadingSubscription(true);
      lastSubscriptionLoadRef.current = now;
      const status = await subscriptionService.checkStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadSalesPerformanceData = async () => {
    // Check if enough time has passed since last load
    const now = Date.now();
    if (now - lastSalesLoadRef.current < minTimeBetweenLoads && !loadingSalesData) {
      return; // Skip this load if it's too soon after the last one
    }
    
    try {
      setLoadingSalesData(true);
      lastSalesLoadRef.current = now;
      
      // Call the sales-stats endpoint from the backend
      const salesStats = await posService.getSalesStats({ period: 'this-month' });
      setSalesPerformance(salesStats);
      
    } catch (error) {
      console.error('Failed to load sales performance data:', error);
    } finally {
      setLoadingSalesData(false);
    }
  };

  const loadDashboardData = async () => {
    // Check if enough time has passed since last load
    const now = Date.now();
    if (now - lastDashboardLoadRef.current < minTimeBetweenLoads && !loadingStats) {
      return; // Skip this load if it's too soon after the last one
    }
    
    try {
      setLoadingStats(true);
      lastDashboardLoadRef.current = now;
      const stats = await dashboardService.getStats();
      const activity = await dashboardService.getRecentActivity(10);
      setDashboardStats(stats);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const debouncedLoadDashboardData = () => {
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    refreshTimeout.current = setTimeout(() => {
      loadDashboardData();
      loadSalesPerformanceData();
    }, 1000);
  };

  if (!user) {
    return null;
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isTrialExpiringSoon = subscriptionStatus?.subscription?.status === SubscriptionStatus.TRIAL && 
                              subscriptionStatus?.daysRemaining <= 1;
  const isExpired = subscriptionStatus?.subscription?.status === SubscriptionStatus.EXPIRED;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back, {user.firstName}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's what's happening with your inventory today.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setVoiceAssistantOpen(true)}
            className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            <AudioLines className="mr-2 h-4 w-4" />
            Ask by voice
          </Button>
        </div>

        <VoiceCommandDialog
          mode="assistant"
          open={voiceAssistantOpen}
          onOpenChange={setVoiceAssistantOpen}
        />

        {/* Subscription Alerts */}
        {!loadingSubscription && subscriptionStatus && (
          <>
            {isTrialExpiringSoon && (
              <Alert className="mb-4 lg:mb-6 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                  Your trial expires in {subscriptionStatus.daysRemaining} day{subscriptionStatus.daysRemaining !== 1 ? 's' : ''}. 
                  <Link href="/subscription" className="ml-1 font-medium text-yellow-700 hover:text-yellow-800">
                    Upgrade now to continue using all features.
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {isExpired && (
              <Alert className="mb-4 lg:mb-6 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm">
                  Your subscription has expired. 
                  <Link href="/subscription" className="ml-1 font-medium text-red-700 hover:text-red-800">
                    Renew your subscription to continue using the service.
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Email Verification Alert */}
        <EmailVerificationBanner className="mb-4 lg:mb-6" />


        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : dashboardStats?.inventory.totalProducts.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : `${dashboardStats?.inventory.lowStockProducts || 0} low stock`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : formatCurrency(dashboardStats?.sales.totalSales || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : `${dashboardStats?.sales.totalOrders || 0} orders`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : dashboardStats?.customers.total.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : `${dashboardStats?.customers.active || 0} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Month Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : dashboardStats?.overview.currentMonthOrders.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Order Status</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {loadingStats ? '...' : dashboardStats?.orders.pending || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Delivered</span>
                  <span className="text-lg font-bold text-green-600">
                    {loadingStats ? '...' : dashboardStats?.orders.delivered || '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Expenses</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : formatCurrency(dashboardStats?.overview.weekExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : 'This week\'s total expenses'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit (This Week)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboardStats?.overview.netProfit && dashboardStats.overview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loadingStats ? '...' : formatCurrency(dashboardStats?.overview.netProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : (
                  <span>
                    Sales Profit: {formatCurrency(dashboardStats?.overview.weekProfit || 0)} - Expenses: {formatCurrency(dashboardStats?.overview.weekExpenses || 0)}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboardStats?.overview.monthProfit && dashboardStats.overview.monthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loadingStats ? '...' : formatCurrency(dashboardStats?.overview.monthProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {loadingStats ? 'Loading...' : (
                  <span>
                    Sales Profit: {formatCurrency(dashboardStats?.overview.monthProfit || 0)} - Expenses: {formatCurrency(dashboardStats?.overview.monthlyExpenses || 0)}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Quick Actions */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline"
                onClick={() => router.push('/inventory')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Product
                </Button>
                <Button className="w-full justify-start" variant="outline"
                onClick={() => router.push('/reports')}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
                <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/inventory')}>
                  <Package className="mr-2 h-4 w-4" />
                  Manage Inventory
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline" 
                  onClick={() => router.push('/customers')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Customers
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline" 
                  onClick={() => router.push('/reports')}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Profit Analysis
                </Button>
                <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push('/subscriptions')}
                >
                  <BadgeDollarSign className="mr-2 h-4 w-4" />
                  Subscriptions
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <div className="xl:col-span-2">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Sales Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {loadingSalesData ? (
                  <div className="h-64 sm:h-80 lg:h-96 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                      <p className="text-gray-500 animate-pulse">Loading sales analytics...</p>
                    </div>
                  </div>
                ) : salesPerformance && salesPerformance.salesByPeriod && salesPerformance.salesByPeriod.length > 0 ? (
                  <SalesChart data={salesPerformance.salesByPeriod} />
                ) : (
                  <div className="h-64 sm:h-80 lg:h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="p-4 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto w-fit">
                        <BarChart3 className="h-12 w-12 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-lg font-medium">No sales data available</p>
                        <p className="text-gray-400 text-sm">Start making sales to see your performance chart</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
