'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Settings, Users, Mail, Eye, EyeOff, Loader2, Plus, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';
import { authService } from '@/lib/auth-service';
import { teamService } from '@/lib/team-service';
import { formatLocalDate } from '@/lib/date-utils';
import { UserRole, Invitation, InvitationStatus } from '@/lib/types';
import { toast } from 'sonner';
import TeamPermissions from '@/components/team-permissions';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type InviteUserForm = z.infer<typeof inviteUserSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [loadingStaffUsers, setLoadingStaffUsers] = useState(true);

  const changePasswordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const inviteUserForm = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      role: UserRole.STAFF,
    },
  });

  useEffect(() => {
    if (!user) return;
    
    // Fetch invitations
    const fetchInvitations = async () => {
      setLoadingInvitations(true);
      try {
        // Try to fetch real invitations from the API
        const response = await authService.getInvitations();
        setInvitations(response);
      } catch (error) {
        console.error('Failed to fetch invitations:', error);
        toast.error('Failed to load invitations');
        
        // Fallback to dummy data if API fails
        setInvitations([
          {
            id: '1',
            email: 'john.doe@example.com',
            role: UserRole.STAFF,
            status: InvitationStatus.PENDING,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            organization: user?.organization!,
            invitedBy: user!,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            email: 'jane.smith@example.com',
            role: UserRole.STAFF,
            status: InvitationStatus.ACCEPTED,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            acceptedAt: new Date().toISOString(),
            organization: user?.organization!,
            invitedBy: user!,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoadingInvitations(false);
      }
    };
    
    // Fetch team members
    const fetchTeamMembers = async () => {
      setLoadingStaffUsers(true);
      try {
        // Attempt to fetch real team members
        const teamMembers = await teamService.getTeamMembers();
        
        // Filter to only staff members
        const staffMembers = teamMembers.filter(member => member.role === UserRole.STAFF);
        setStaffUsers(staffMembers);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        toast.error('Failed to load team members');
        
        // Fallback to dummy data if API call fails
        setStaffUsers([
          {
            id: 'staff-1',
            email: 'staff.one@example.com',
            firstName: 'Staff',
            lastName: 'One',
            role: UserRole.STAFF,
            status: 'active',
          },
          {
            id: 'staff-2',
            email: 'staff.two@example.com',
            firstName: 'Staff',
            lastName: 'Two',
            role: UserRole.STAFF,
            status: 'active',
          }
        ]);
      } finally {
        setLoadingStaffUsers(false);
      }
    };
    
    fetchInvitations();
    fetchTeamMembers();
  }, [user]);

  const onChangePassword = async (data: ChangePasswordForm) => {
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      changePasswordForm.reset();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    }
  };

  const onInviteUser = async (data: InviteUserForm) => {
    try {
      await authService.inviteUser(data);
      toast.success('Invitation sent successfully');
      inviteUserForm.reset();
      setInviteDialogOpen(false);
      
      // Refresh invitations list
      const fetchInvitations = async () => {
        setLoadingInvitations(true);
        try {
          const response = await authService.getInvitations();
          setInvitations(response);
        } catch (error) {
          console.error('Failed to refresh invitations:', error);
        } finally {
          setLoadingInvitations(false);
        }
      };
      
      fetchInvitations();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send invitation';
      toast.error(message);
    }
  };

  const getStatusBadge = (status: InvitationStatus) => {
    const variants = {
      [InvitationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [InvitationStatus.ACCEPTED]: 'bg-green-100 text-green-800',
      [InvitationStatus.EXPIRED]: 'bg-gray-100 text-gray-800',
      [InvitationStatus.REVOKED]: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account and team settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              Security
            </TabsTrigger>
            {user.role === UserRole.OWNER && (
              <>
                <TabsTrigger value="team" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Settings className="h-4 w-4" />
                  Permissions
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your account details and organization information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <p className="text-sm text-gray-900 mt-1">{user.firstName}</p>
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <p className="text-sm text-gray-900 mt-1">{user.lastName}</p>
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-gray-900 mt-1">{user.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{user.role}</p>
                </div>
                {user.organization && (
                  <div>
                    <Label>Organization</Label>
                    <p className="text-sm text-gray-900 mt-1">{user.organization.name}</p>
                  </div>
                )}
                <div>
                  <Label>Account Status</Label>
                  <div className="mt-1">
                    <Badge className={user.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {user.isEmailVerified ? 'Verified' : 'Pending Verification'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="mt-1 relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...changePasswordForm.register('currentPassword')}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {changePasswordForm.formState.errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {changePasswordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="mt-1 relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        {...changePasswordForm.register('newPassword')}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {changePasswordForm.formState.errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {changePasswordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="mt-1 relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...changePasswordForm.register('confirmPassword')}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {changePasswordForm.formState.errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {changePasswordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={changePasswordForm.formState.isSubmitting}
                  >
                    {changePasswordForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {user.role === UserRole.OWNER && (
            <TabsContent value="team" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Team Members</h3>
                  <p className="text-sm text-gray-600">Invite and manage your team members</p>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to add a new team member to your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={inviteUserForm.handleSubmit(onInviteUser)} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          {...inviteUserForm.register('email')}
                          placeholder="john.doe@example.com"
                        />
                        {inviteUserForm.formState.errors.email && (
                          <p className="mt-1 text-sm text-red-600">
                            {inviteUserForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            {...inviteUserForm.register('firstName')}
                            placeholder="John"
                          />
                          {inviteUserForm.formState.errors.firstName && (
                            <p className="mt-1 text-sm text-red-600">
                              {inviteUserForm.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            {...inviteUserForm.register('lastName')}
                            placeholder="Doe"
                          />
                          {inviteUserForm.formState.errors.lastName && (
                            <p className="mt-1 text-sm text-red-600">
                              {inviteUserForm.formState.errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select defaultValue={UserRole.STAFF} onValueChange={(value) => inviteUserForm.setValue('role', value as UserRole)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.STAFF}>Staff</SelectItem>
                            <SelectItem value={UserRole.OWNER}>Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setInviteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={inviteUserForm.formState.isSubmitting}
                        >
                          {inviteUserForm.formState.isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  {loadingInvitations ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>{invitation.email}</TableCell>
                            <TableCell className="capitalize">{invitation.role}</TableCell>
                            <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                            <TableCell>{formatLocalDate(invitation.createdAt)}</TableCell>
                            <TableCell>{formatLocalDate(invitation.expiresAt)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      // Only allow resending pending invitations
                                      if (invitation.status === InvitationStatus.PENDING) {
                                        const resendInvitation = async () => {
                                          try {
                                            await authService.resendInvitation(invitation.id);
                                            toast.success('Invitation resent successfully');
                                          } catch (error: any) {
                                            const message = error.response?.data?.message || 'Failed to resend invitation';
                                            toast.error(message);
                                          }
                                        };
                                        resendInvitation();
                                      } else {
                                        toast.info('Only pending invitations can be resent');
                                      }
                                    }}
                                    disabled={invitation.status !== InvitationStatus.PENDING}
                                  >
                                    Resend Invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => {
                                      // Only allow revoking pending invitations
                                      if (invitation.status === InvitationStatus.PENDING) {
                                        const revokeInvitation = async () => {
                                          try {
                                            await authService.revokeInvitation(invitation.id);
                                            toast.success('Invitation revoked successfully');
                                            
                                            // Remove from list after successful revoke
                                            setInvitations(prevInvitations => 
                                              prevInvitations.filter(inv => inv.id !== invitation.id)
                                            );
                                          } catch (error: any) {
                                            const message = error.response?.data?.message || 'Failed to revoke invitation';
                                            toast.error(message);
                                          }
                                        };
                                        revokeInvitation();
                                      } else {
                                        toast.info('Only pending invitations can be revoked');
                                      }
                                    }}
                                    disabled={invitation.status !== InvitationStatus.PENDING}
                                  >
                                    Revoke Invitation
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {user.role === UserRole.OWNER && (
            <TabsContent value="permissions" className="space-y-6">
              {loadingStaffUsers ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  <span className="ml-2">Loading team members...</span>
                </div>
              ) : (
                <TeamPermissions users={staffUsers} currentUser={user} />
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
