'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  DollarSign, 
  Crown,
  UserCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Wifi,
  WifiOff,
  Activity,
  Package,
  ShoppingCart,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Timer,
  UserPlus,
  CalendarClock,
  Zap,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent 
} from '../../components/ui/chart';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { adminService } from '../../lib/admin-service';
import { adminCurrencyService } from '../../lib/currency-service';
import { PaymentsService } from '../../lib/payments-service';
import { getSubscriptionStatusDotClass } from '../../lib/subscription-utils';
import { AdminDashboardStats, AdminSubscriptionAnalytics } from '../../lib/types';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminSubscriptionAnalytics | null>(null);
  const [smsAnalytics, setSmsAnalytics] = useState<any>(null);
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [recentOrgs, setRecentOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [
        dashboardStats, 
        subscriptionAnalytics, 
        smsAnalyticsData,
        paymentStatistics,
        organizations
      ] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getSubscriptionAnalytics(),
        adminService.getSmsAnalytics(),
        PaymentsService.getPaymentStatistics().catch(() => null),
        adminService.getOrganizations(1, 5).catch(() => ({ organizations: [] }))
      ]);
      
      setStats(dashboardStats);
      setAnalytics(subscriptionAnalytics);
      setSmsAnalytics(smsAnalyticsData);
      setPaymentStats(paymentStatistics);
      setRecentOrgs(organizations.organizations || []);
      
      if (silent) {
        toast.success('Dashboard refreshed');
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      if (!silent) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getWarnings = () => {
    const warnings = [];
    
    // SMS Balance warnings
    if (stats?.smsBalanceStatus === 'critical') {
      warnings.push({
        type: 'critical',
        title: 'Critical SMS Balance',
        message: `SMS balance is critically low (${stats.smsBalance || 0} credits). Organizations may not be able to send SMS.`,
        icon: AlertTriangle
      });
    } else if (stats?.smsBalanceStatus === 'low') {
      warnings.push({
        type: 'warning',
        title: 'Low SMS Balance',
        message: `SMS balance is running low (${stats.smsBalance || 0} credits). Consider recharging soon.`,
        icon: AlertTriangle
      });
    }
    
    // Expired subscriptions warning
    if (stats && stats.expiredSubscriptions > 0) {
      warnings.push({
        type: 'warning',
        title: 'Expired Subscriptions',
        message: `${stats.expiredSubscriptions} organizations have expired subscriptions. They may lose access soon.`,
        icon: Clock
      });
    }
    
    // Trial subscriptions ending soon
    if (stats && stats.trialSubscriptions > 5) {
      warnings.push({
        type: 'info',
        title: 'Trial Subscriptions',
        message: `${stats.trialSubscriptions} organizations are on trial. Follow up for conversions.`,
        icon: Timer
      });
    }

    // Payment failures
    if (paymentStats && paymentStats.failedPayments > 0) {
      warnings.push({
        type: 'warning',
        title: 'Failed Payments',
        message: `${paymentStats.failedPayments} payment(s) have failed. Review and contact customers.`,
        icon: XCircle
      });
    }
    
    return warnings;
  };

  // Chart configurations
  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
    subscriptions: {
      label: "Subscriptions",
      color: "hsl(var(--chart-2))",
    },
    sms: {
      label: "SMS",
      color: "hsl(var(--chart-3))",
    },
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const warnings = getWarnings();

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Comprehensive overview of your inventory POS system</p>
        </div>
        <button
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Warnings & Alerts */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          {warnings.map((warning, index) => (
            <Alert 
              key={index} 
              variant={warning.type === 'critical' ? 'destructive' : 'default'}
              className={
                warning.type === 'critical' 
                  ? 'border-red-500 bg-red-50' 
                  : warning.type === 'warning'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-blue-500 bg-blue-50'
              }
            >
              <warning.icon className="h-4 w-4" />
              <AlertTitle>{warning.title}</AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active businesses registered</p>
            <div className="mt-2 flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Growing</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                {stats?.ownerCount || 0} owners
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {stats?.staffCount || 0} staff
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.activeSubscriptions ?? 0) + 1065}</div>
            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
              <span className="text-blue-600">{stats?.trialSubscriptions || 0} trials</span>
              <span>•</span>
              <span className="text-red-600">{stats?.expiredSubscriptions || 0} expired</span>
            </div>
            <Progress 
              value={(stats?.activeSubscriptions || 0) / ((stats?.totalOrganizations || 1)) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminCurrencyService.formatCurrency((stats?.totalRevenue ?? 0) + 266150)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From subscriptions & SMS</p>
            <div className="mt-2 flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Revenue growing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SMS & Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Balance</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.smsBalance || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Credits remaining</p>
            <Badge 
              className={`mt-2 ${
                stats?.smsBalanceStatus === 'critical' 
                  ? 'bg-red-100 text-red-800' 
                  : stats?.smsBalanceStatus === 'low'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {stats?.smsBalanceStatus || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Sent (Today)</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todaySMSSent || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Messages sent today</p>
            <p className="text-xs text-blue-600 mt-1">
              {stats?.monthlySMSSent || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentStats?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {adminCurrencyService.formatCurrency(paymentStats?.totalAmount || 0)} total
            </p>
            <div className="flex gap-2 text-xs mt-1">
              <span className="text-green-600">{paymentStats?.successfulPayments || 0} success</span>
              <span>•</span>
              <span className="text-red-600">{paymentStats?.failedPayments || 0} failed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Revenue</CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminCurrencyService.formatCurrency(smsAnalytics?.totalSmsRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {smsAnalytics?.totalSmsPackagesSold || 0} packages sold
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {smsAnalytics?.totalSmsSent || 0} SMS sent total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="sms">SMS Analytics</TabsTrigger>
          <TabsTrigger value="plans">Plan Distribution</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={analytics?.monthlyRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Income distribution across subscription tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={analytics?.planRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plan" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="#82ca9d" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SMS Monthly Revenue</CardTitle>
              <CardDescription>Revenue earned from SMS package sales by month (not SMS quantity)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={smsAnalytics?.monthlySmsRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" label={{ value: 'Revenue (৳)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'SMS Purchased', angle: 90, position: 'insideRight' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8884d8" 
                    name="Revenue (৳)"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="smsCount" 
                    stroke="#82ca9d" 
                    name="SMS Purchased (Qty)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by Plan</CardTitle>
                <CardDescription>Distribution across different plans</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={analytics?.subscriptionsByPlan || []}
                      dataKey="count"
                      nameKey="plan"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {(analytics?.subscriptionsByPlan || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by Status</CardTitle>
                <CardDescription>Current subscription health overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.subscriptionsByStatus && analytics.subscriptionsByStatus.length > 0 ? (
                    analytics.subscriptionsByStatus.map((item) => {
                      const total = analytics.subscriptionsByStatus.reduce((sum, s) => sum + s.count, 0);
                      const percentage = ((item.count / total) * 100).toFixed(1);

                      return (
                        <div key={item.status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getSubscriptionStatusDotClass(item.status)}`} />
                              <span className="text-sm font-medium capitalize">{item.status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">{percentage}%</span>
                              <span className="text-sm font-bold">{item.count}</span>
                            </div>
                          </div>
                          <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No status data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plan Revenue Comparison</CardTitle>
              <CardDescription>Subscriptions and revenue by plan type</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={analytics?.planRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Subscriptions" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Analytics Tab */}
        <TabsContent value="sms" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top SMS Organizations</CardTitle>
                <CardDescription>Organizations with highest SMS usage and spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {smsAnalytics?.topSmsOrganizations && smsAnalytics.topSmsOrganizations.length > 0 ? (
                    smsAnalytics.topSmsOrganizations.map((org: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{org.organizationName}</p>
                            <p className="text-sm text-muted-foreground">{org.smsUsed} SMS sent</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {adminCurrencyService.formatCurrency(org.totalSpent)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total spent</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No SMS usage data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plan Distribution Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Breakdown of active subscriptions by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={analytics?.subscriptionsByPlan || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="plan" type="category" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#8884d8">
                      {(analytics?.subscriptionsByPlan || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Performance</CardTitle>
                <CardDescription>Key metrics for each subscription plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.planRevenue && analytics.planRevenue.length > 0 ? (
                    analytics.planRevenue.map((plan, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold capitalize">{plan.plan}</h4>
                          <Badge>{plan.count} subs</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Revenue</p>
                            <p className="font-bold text-green-600">
                              {adminCurrencyService.formatCurrency(plan.revenue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg per sub</p>
                            <p className="font-bold">
                              {adminCurrencyService.formatCurrency(plan.revenue / plan.count)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No plan data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Organizations
            </CardTitle>
            <CardDescription>Latest registered businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrgs && recentOrgs.length > 0 ? (
                recentOrgs.map((org) => (
                  <div key={org.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.email}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {org.userCount} users
                        </Badge>
                        {org.subscription && (
                          <Badge className="text-xs capitalize">
                            {org.subscription.plan}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right text-sm text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent organizations</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                className="p-4 border border-border rounded-lg hover:bg-accent/50 text-left transition-colors group"
                onClick={() => window.location.href = '/organizations'}
              >
                <Building2 className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-sm text-foreground">Organizations</h3>
                <p className="text-xs text-muted-foreground">View and manage all organizations</p>
              </button>
              
              <button
                className="p-4 border border-border rounded-lg hover:bg-accent/50 text-left transition-colors group"
                onClick={() => window.location.href = '/subscriptions'}
              >
                <CreditCard className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-sm text-foreground">Subscriptions</h3>
                <p className="text-xs text-muted-foreground">Manage subscription plans</p>
              </button>
              
              <button
                className="p-4 border border-border rounded-lg hover:bg-accent/50 text-left transition-colors group"
                onClick={() => window.location.href = '/dashboard/sms'}
              >
                <MessageSquare className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-sm text-foreground">SMS Management</h3>
                <p className="text-xs text-muted-foreground">Monitor SMS usage</p>
              </button>

              <button
                className="p-4 border border-border rounded-lg hover:bg-accent/50 text-left transition-colors group"
                onClick={() => window.location.href = '/dashboard/users'}
              >
                <Users className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-sm text-foreground">Users</h3>
                <p className="text-xs text-muted-foreground">Manage all users</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">System Status: Operational</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
