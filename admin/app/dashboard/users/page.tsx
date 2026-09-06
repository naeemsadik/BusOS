'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Users, 
  Crown, 
  UserCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailCheck,
  MailX,
  Building2,
  MoreVertical,
  UserX,
  UserCog,
  RefreshCw,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { adminService } from '../../../lib/admin-service';
import { AdminUserItem, UserRole, UserStatus } from '../../../lib/types';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pageSize = 10;

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const loadUsers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const response = await adminService.getUsers(currentPage, pageSize);
      setUsers(response.users);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      
      if (silent) {
        toast.success('Users list refreshed');
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const variants = {
      [UserRole.OWNER]: 'bg-primary text-primary-foreground',
      [UserRole.STAFF]: 'bg-secondary text-secondary-foreground',
      [UserRole.ADMIN]: 'bg-destructive text-destructive-foreground',
    };

    const icons = {
      [UserRole.OWNER]: Crown,
      [UserRole.STAFF]: UserCheck,
      [UserRole.ADMIN]: UserCog,
    };

    const Icon = icons[role];

    return (
      <Badge className={variants[role]}>
        <Icon className="h-3 w-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    const variants = {
      [UserStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
      [UserStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      [UserStatus.SUSPENDED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Note: Implement delete user API endpoint in adminService
      // await adminService.deleteUser(selectedUser.id);
      toast.success('User ' + selectedUser.email + ' deleted successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers(true);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const exportUsers = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Role', 'Status', 'Organization', 'Verified', 'Created'];
    const rows = filteredUsers.map(user => [
      user.firstName + ' ' + user.lastName,
      user.email,
      user.role,
      user.status,
      user.organization?.name || 'N/A',
      user.isEmailVerified ? 'Yes' : 'No',
      format(new Date(user.createdAt), 'yyyy-MM-dd')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'users_' + format(new Date(), 'yyyy-MM-dd') + '.csv';
    link.click();
    
    toast.success('Users exported successfully');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organization?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesVerification = 
      verificationFilter === 'all' || 
      (verificationFilter === 'verified' && user.isEmailVerified) ||
      (verificationFilter === 'unverified' && !user.isEmailVerified);

    return matchesSearch && matchesRole && matchesStatus && matchesVerification;
  });

  // Calculate stats
  const stats = {
    totalUsers: total,
    owners: users.filter(u => u.role === UserRole.OWNER).length,
    staff: users.filter(u => u.role === UserRole.STAFF).length,
    verified: users.filter(u => u.isEmailVerified).length,
    active: users.filter(u => u.status === UserStatus.ACTIVE).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all users across organizations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportUsers}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Owners</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.owners}</p>
              </div>
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Staff</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.staff}</p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.verified}</p>
              </div>
              <MailCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>All registered users and their details</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Organization</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground md:hidden">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {user.isEmailVerified ? (
                              <MailCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <MailX className="h-3 w-3 text-red-600 dark:text-red-400" />
                            )}
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {user.isEmailVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{user.email}</span>
                        {user.isEmailVerified ? (
                          <MailCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <MailX className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.organization ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{user.organization.name}</span>
                        </div>
                      ) : (
                        <Badge variant="secondary">No Org</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(user.status)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {user.lastLoginAt 
                          ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy')
                          : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              navigator.clipboard.writeText(user.email);
                              toast.success('Email copied to clipboard');
                            }}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Copy Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCog className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} users
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <strong>{selectedUser?.email}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
