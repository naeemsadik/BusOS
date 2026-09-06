"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Wifi,
  ShoppingCart,
  History,
  Settings,
  Send,
  Users,
  Phone
} from 'lucide-react';
import { smsService } from '@/lib/sms-service';
import { toast } from 'sonner';
import { SmsUsageStats, SmsBalanceStatus } from '@/lib/types';
import SmsPurchasePage from '@/components/sms/sms-purchase';

export default function SmsPage() {
  const [smsStats, setSmsStats] = useState<SmsUsageStats | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<SmsBalanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadSmsData();
  }, []);

  const loadSmsData = async () => {
    try {
      const [statsData, statusData] = await Promise.all([
        smsService.getSmsUsageStats(),
        smsService.getBalanceStatus(),
      ]);
      
      setSmsStats(statsData);
      setBalanceStatus(statusData);
    } catch (error: any) {
      console.error('Failed to load SMS data:', error);
      toast.error('Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  };

  const getBalanceStatusCard = () => {
    if (!balanceStatus) return null;

    const statusConfig = {
      critical: {
        icon: WifiOff,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        textColor: 'text-red-800',
        title: 'Critical',
        description: 'Immediate action required',
      },
      low: {
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-800',
        title: 'Low Balance',
        description: 'Consider recharging soon',
      },
      healthy: {
        icon: Wifi,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        textColor: 'text-green-800',
        title: 'Service Active',
        description: 'Balance is healthy',
      },
    };

    const config = statusConfig[balanceStatus.status];
    const Icon = config.icon;

    return (
      <Card className={config.bgColor}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SMS Balance Status</CardTitle>
          <div className="flex items-center gap-1">
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${config.textColor}`}>
            ৳{balanceStatus.balance.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.textColor}>
              {config.title}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {balanceStatus.message}
          </p>
        </CardContent>
      </Card>
    );
  };

  const getQuickActions = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common SMS operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setActiveTab("purchase")}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase SMS Credits
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setActiveTab("send")}
          >
            <Send className="w-4 h-4 mr-2" />
            Send SMS
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setActiveTab("history")}
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setActiveTab("bulk")}
          >
            <Users className="w-4 h-4 mr-2" />
            Bulk SMS
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Gateway</h1>
          <p className="text-muted-foreground">Send SMS notifications and manage messaging campaigns</p>
        </div>
        <Button onClick={() => setActiveTab("purchase")} className="gap-2">
          <ShoppingCart className="w-4 h-4" />
          Purchase SMS
        </Button>
      </div>

      {/* Balance Status Alert */}
      {balanceStatus?.status === 'critical' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Critical: No SMS Balance</div>
            <div className="text-sm mt-1">
              Your SMS balance is critically low. Purchase SMS immediately to continue sending messages.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {balanceStatus?.status === 'low' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Warning: Low SMS Balance</div>
            <div className="text-sm mt-1">
              Your SMS balance is running low. Consider purchasing more SMS to avoid service interruption.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{smsStats?.balance.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">SMS remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Sent</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{smsStats?.todaySent || 0}</div>
            <p className="text-xs text-muted-foreground">Messages sent today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{smsStats?.monthlySent || 0}</div>
            <p className="text-xs text-muted-foreground">Messages this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">৳{((smsStats?.totalSent || 0) * 0.5).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Estimated spending</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchase">Purchase</TabsTrigger>
          <TabsTrigger value="send">Send SMS</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {getBalanceStatusCard()}
            {getQuickActions()}
          </div>
        </TabsContent>

        <TabsContent value="purchase" className="mt-6">
          <SmsPurchasePage />
        </TabsContent>

        <TabsContent value="send" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Send SMS</CardTitle>
              <CardDescription>Send individual SMS messages</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">SMS sending form will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS History</CardTitle>
              <CardDescription>View all sent messages and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">SMS history table will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Settings</CardTitle>
              <CardDescription>Configure SMS gateway and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">SMS settings form will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
