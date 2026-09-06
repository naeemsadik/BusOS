'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  MessageSquare, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Users,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Save,
  Phone,
  Wifi,
  WifiOff
} from 'lucide-react';
import { adminService } from '../../../lib/admin-service';
import { toast } from 'sonner';
import { useAdminCurrency } from '../../../contexts/currency-context';

interface SmsSettings {
  pricePerSms: number;
  minimumPurchase: number;
  maximumPurchase: number;
  lowBalanceThreshold: number;
  criticalBalanceThreshold: number;
  isEnabled: boolean;
}

interface SmsGlobalStats {
  totalOrganizations: number;
  totalMessagesSent: number;
  totalRevenue: number;
  averagePricePerSms: number;
  organizationsWithLowBalance: number;
  organizationsWithCriticalBalance: number;
  topOrganizations: Array<{
    id: string;
    name: string;
    messagesSent: number;
    revenue: number;
    balance: number;
    status: 'healthy' | 'low' | 'critical';
  }>;
}

// Helper function to safely convert to number
const toNumber = (value: any, defaultValue: number = 0): number => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Helper function to safely format number
const safeToFixed = (value: any, decimals: number = 2): string => {
  const num = toNumber(value);
  return num.toFixed(decimals);
};

export default function AdminSmsPage() {
  const { formatCurrency } = useAdminCurrency();
  const [settings, setSettings] = useState<SmsSettings>({
    pricePerSms: 0.5,
    minimumPurchase: 100,
    maximumPurchase: 50000,
    lowBalanceThreshold: 50,
    criticalBalanceThreshold: 10,
    isEnabled: true,
  });
  const [globalStats, setGlobalStats] = useState<SmsGlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSmsData();
  }, []);

  const loadSmsData = async () => {
    try {
      const [settingsData, statsData] = await Promise.all([
        adminService.getSmsSettings(),
        adminService.getSmsGlobalStats(),
      ]);
      
      // Safely convert settings to numbers
      const safeSettings: SmsSettings = {
        pricePerSms: toNumber(settingsData.pricePerSms, 0.5),
        minimumPurchase: toNumber(settingsData.minimumPurchase, 100),
        maximumPurchase: toNumber(settingsData.maximumPurchase, 50000),
        lowBalanceThreshold: toNumber(settingsData.lowBalanceThreshold, 50),
        criticalBalanceThreshold: toNumber(settingsData.criticalBalanceThreshold, 10),
        isEnabled: Boolean(settingsData.isEnabled ?? true),
      };

      // Safely convert stats to numbers
      const safeStats: SmsGlobalStats = {
        totalOrganizations: toNumber(statsData.totalOrganizations),
        totalMessagesSent: toNumber(statsData.totalMessagesSent),
        totalRevenue: toNumber(statsData.totalRevenue),
        averagePricePerSms: toNumber(statsData.averagePricePerSms),
        organizationsWithLowBalance: toNumber(statsData.organizationsWithLowBalance),
        organizationsWithCriticalBalance: toNumber(statsData.organizationsWithCriticalBalance),
        topOrganizations: (statsData.topOrganizations || []).map((org: any) => ({
          id: String(org.id || ''),
          name: String(org.name || ''),
          messagesSent: toNumber(org.messagesSent),
          revenue: toNumber(org.revenue),
          balance: toNumber(org.balance),
          status: ['healthy', 'low', 'critical'].includes(org.status) ? org.status : 'healthy',
        })),
      };
      
      setSettings(safeSettings);
      setGlobalStats(safeStats);
    } catch (error: any) {
      console.error('Failed to load SMS data:', error);
      toast.error('Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await adminService.updateSmsSettings(settings);
      toast.success('SMS settings updated successfully');
    } catch (error: any) {
      console.error('Failed to update SMS settings:', error);
      toast.error('Failed to update SMS settings');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: Wifi },
      low: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      critical: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: WifiOff },
    };
    
    const config = variants[status as keyof typeof variants] || variants.healthy;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
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
          <h1 className="text-3xl font-bold">SMS Management</h1>
          <p className="text-muted-foreground">Configure SMS pricing and monitor usage across all organizations</p>
        </div>
      </div>

      {/* Global SMS Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.totalOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground">Using SMS service</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{globalStats?.totalMessagesSent?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(globalStats?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">From SMS purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price/SMS</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(globalStats?.averagePricePerSms || 0)}</div>
            <p className="text-xs text-muted-foreground">Current average</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Status Alerts */}
      {(globalStats?.organizationsWithCriticalBalance || 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">
              {globalStats?.organizationsWithCriticalBalance} organization(s) have critical SMS balance
            </div>
            <div className="text-sm mt-1">
              These organizations cannot send SMS and need immediate attention.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(globalStats?.organizationsWithLowBalance || 0) > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">
              {globalStats?.organizationsWithLowBalance} organization(s) have low SMS balance
            </div>
            <div className="text-sm mt-1">
              Consider notifying these organizations to recharge their SMS balance.
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">SMS Settings</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Configuration</CardTitle>
              <CardDescription>Set SMS pricing and purchase limits for all organizations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pricePerSms">Price per SMS (৳)</Label>
                  <Input
                    id="pricePerSms"
                    type="number"
                    step="0.001"
                    value={settings.pricePerSms}
                    onChange={(e) => setSettings({ ...settings, pricePerSms: toNumber(e.target.value, 0) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current price: ৳{safeToFixed(settings.pricePerSms, 3)} per SMS
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumPurchase">Minimum Purchase (SMS count)</Label>
                  <Input
                    id="minimumPurchase"
                    type="number"
                    value={settings.minimumPurchase}
                    onChange={(e) => setSettings({ ...settings, minimumPurchase: toNumber(e.target.value, 0) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: {settings.minimumPurchase} SMS (৳{safeToFixed(settings.minimumPurchase * settings.pricePerSms)})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maximumPurchase">Maximum Purchase (SMS count)</Label>
                  <Input
                    id="maximumPurchase"
                    type="number"
                    value={settings.maximumPurchase}
                    onChange={(e) => setSettings({ ...settings, maximumPurchase: toNumber(e.target.value, 0) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: {settings.maximumPurchase} SMS (৳{safeToFixed(settings.maximumPurchase * settings.pricePerSms)})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowBalanceThreshold">Low Balance Threshold</Label>
                  <Input
                    id="lowBalanceThreshold"
                    type="number"
                    value={settings.lowBalanceThreshold}
                    onChange={(e) => setSettings({ ...settings, lowBalanceThreshold: toNumber(e.target.value, 0) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when balance drops below {settings.lowBalanceThreshold} SMS
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criticalBalanceThreshold">Critical Balance Threshold</Label>
                  <Input
                    id="criticalBalanceThreshold"
                    type="number"
                    value={settings.criticalBalanceThreshold}
                    onChange={(e) => setSettings({ ...settings, criticalBalanceThreshold: toNumber(e.target.value, 0) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Block sending when balance drops below {settings.criticalBalanceThreshold} SMS
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization SMS Status</CardTitle>
              <CardDescription>Monitor SMS balance and usage across all organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Messages Sent</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalStats?.topOrganizations?.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="font-medium">{org.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{org.balance} SMS</div>
                        </TableCell>
                        <TableCell>{org.messagesSent.toLocaleString()}</TableCell>
                        <TableCell>৳{safeToFixed(org.revenue)}</TableCell>
                        <TableCell>{getStatusBadge(org.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>SMS revenue analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-lg font-bold">৳{safeToFixed(globalStats?.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Messages Sent</span>
                    <span className="text-lg font-bold">{globalStats?.totalMessagesSent?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Price</span>
                    <span className="text-lg font-bold">৳{safeToFixed(globalStats?.averagePricePerSms, 3)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Balance Distribution</CardTitle>
                <CardDescription>Organization balance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Healthy Balance</span>
                    </div>
                    <span className="font-bold">
                      {(globalStats?.totalOrganizations || 0) - 
                       (globalStats?.organizationsWithLowBalance || 0) - 
                       (globalStats?.organizationsWithCriticalBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Low Balance</span>
                    </div>
                    <span className="font-bold">{globalStats?.organizationsWithLowBalance || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Critical Balance</span>
                    </div>
                    <span className="font-bold">{globalStats?.organizationsWithCriticalBalance || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
