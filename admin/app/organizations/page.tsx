'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Building2, 
  Users, 
  Crown, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { adminService } from '../../lib/admin-service';
import { AdminOrganizationItem, SubscriptionStatus } from '../../lib/types';
import { toast } from 'sonner';
import { DataState, MetricCard, PageHeader, PageSkeleton } from '@/components/ui/page-primitives';

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState('');

  const pageSize = 10;

  useEffect(() => {
    loadOrganizations();
  }, [currentPage]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await adminService.getOrganizations(currentPage, pageSize);
      setOrganizations(response.organizations);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      setLoadError(error?.response?.data?.message || 'Organizations could not be loaded.');
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants = {
      [SubscriptionStatus.TRIAL]: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
      [SubscriptionStatus.ACTIVE]: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      [SubscriptionStatus.EXPIRED]: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
      [SubscriptionStatus.CANCELLED]: 'border-border bg-muted text-muted-foreground',
      [SubscriptionStatus.SUSPENDED]: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <PageSkeleton />;
  }
  if (loadError && organizations.length === 0) return <DataState title="Organizations unavailable" description={loadError} onRetry={loadOrganizations} />;

  return (
    <div className="mx-auto max-w-[100rem] space-y-6 pb-8">
      <PageHeader title="Organizations" description="Manage tenant organizations, owners, staff, and subscription health." />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total organizations" value={total} icon={Building2} tone="primary" />
        <MetricCard label="Active subscriptions" value={organizations.filter(org => org.subscription?.status === SubscriptionStatus.ACTIVE).length} icon={Crown} tone="success" />
        <MetricCard label="Trial organizations" value={organizations.filter(org => org.subscription?.status === SubscriptionStatus.TRIAL).length} icon={Calendar} tone="warning" />
        <MetricCard label="Users on this page" value={organizations.reduce((sum, org) => sum + org.userCount, 0)} icon={Users} tone="accent" />
        <Card className="hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Organizations</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{total}</p>
              </div>
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {organizations.filter(org => org.subscription?.status === SubscriptionStatus.ACTIVE).length}
                </p>
              </div>
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Trial Organizations</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {organizations.filter(org => org.subscription?.status === SubscriptionStatus.TRIAL).length}
                </p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {organizations.reduce((sum, org) => sum + org.userCount, 0)}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Organization List</CardTitle>
          <CardDescription>All registered organizations and their details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Organizations Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">Owner Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Users</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow key={org.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{org.name}</div>
                        <div className="text-sm text-muted-foreground md:hidden">{org.email}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{org.id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-foreground">{org.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-sm">
                        <div className="text-foreground">Total: {org.userCount}</div>
                        <div className="text-muted-foreground text-xs">
                          {org.ownerCount} owners, {org.staffCount} staff
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.subscription ? (
                        <div>
                          <Badge variant="outline" className="capitalize">
                            {org.subscription.plan}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            ${org.subscription.price}/month
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">No Subscription</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {org.subscription ? (
                        <div>
                          {getStatusBadge(org.subscription.status)}
                          <div className="text-sm text-muted-foreground mt-1">
                            Ends: {format(new Date(org.subscription.endDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(org.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} organizations
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <div className="text-sm px-3 py-1 bg-muted rounded">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
