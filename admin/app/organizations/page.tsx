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
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { adminService } from '../../lib/admin-service';
import { AdminOrganizationItem, SubscriptionStatus } from '../../lib/types';
import { toast } from 'sonner';

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const pageSize = 10;

  useEffect(() => {
    loadOrganizations();
  }, [currentPage]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await adminService.getOrganizations(currentPage, pageSize);
      setOrganizations(response.organizations);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants = {
      [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [SubscriptionStatus.EXPIRED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [SubscriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
      [SubscriptionStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Organizations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all organizations and their subscriptions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
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

        <Card className="hover:shadow-lg transition-shadow">
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

        <Card className="hover:shadow-lg transition-shadow">
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

        <Card className="hover:shadow-lg transition-shadow">
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
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
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
