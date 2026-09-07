import React, { useState, useEffect } from 'react';
import { User, UserPermission, PermissionModuleType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { permissionsService } from '@/lib/permissions-service';

interface TeamPermissionsProps {
  users: User[];
  currentUser: User;
}

// Maps PermissionModuleType to a more user-friendly display name and description
const moduleInfo = {
  [PermissionModuleType.POS]: { 
    name: 'POS / Sales', 
    description: 'Access to the point of sale system for creating sales and managing transactions.' 
  },
  [PermissionModuleType.INVENTORY]: { 
    name: 'Inventory Management', 
    description: 'Manage products, stock levels, and categories.' 
  },
  [PermissionModuleType.CUSTOMERS]: { 
    name: 'Customer Management', 
    description: 'Access to customer data, creation of customers, and customer history.' 
  },
  [PermissionModuleType.ORDERS]: { 
    name: 'Orders Management', 
    description: 'View and manage orders, update status, and process returns.' 
  },
  [PermissionModuleType.INVOICES]: { 
    name: 'Invoices', 
    description: 'Create, view, and manage invoices and payment records.' 
  },
  [PermissionModuleType.EXPENSES]: { 
    name: 'Expenses', 
    description: 'Track and manage business expenses and expense categories.' 
  },
  [PermissionModuleType.REPORTS]: { 
    name: 'Reports', 
    description: 'Access to sales, inventory, and financial reports.' 
  },
  [PermissionModuleType.SETTINGS]: { 
    name: 'Settings', 
    description: 'Access to system settings and configuration.' 
  },
  [PermissionModuleType.DELIVERY]: { 
    name: 'Delivery', 
    description: 'Manage delivery options, track shipments, and update delivery status.' 
  },
  [PermissionModuleType.PAYMENTS]: { 
    name: 'Payments', 
    description: 'Process payments, refunds, and view payment history.' 
  },
  [PermissionModuleType.SUPPLIERS]: { 
    name: 'Suppliers', 
    description: 'Manage supplier information and purchase orders.' 
  },
  [PermissionModuleType.DASHBOARD]: { 
    name: 'Dashboard', 
    description: 'Access to the main dashboard and analytics.' 
  },
};

export default function TeamPermissions(_props: TeamPermissionsProps) {
  const [activeModule, setActiveModule] = useState<PermissionModuleType>(PermissionModuleType.POS);
  const [usersWithPermissions, setUsersWithPermissions] = useState<{ userId: string; user: User; permission: UserPermission }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [originalPermissions, setOriginalPermissions] = useState<{ userId: string; user: User; permission: UserPermission }[]>([]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const permissions = await permissionsService.getModulePermissions(activeModule);
      setUsersWithPermissions(permissions);
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions))); // Create deep copy
      setHasChanges(false);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  // Ask for confirmation before changing module if there are unsaved changes
  const handleModuleChange = (newModule: PermissionModuleType) => {
    if (hasChanges) {
      if (confirm("You have unsaved changes. Switching modules will lose these changes. Continue?")) {
        setActiveModule(newModule);
      }
    } else {
      setActiveModule(newModule);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [activeModule]);

  const handlePermissionChange = (userId: string, action: 'view' | 'create' | 'edit' | 'delete', value: boolean) => {
    const userPermission = usersWithPermissions.find(up => up.userId === userId);
    if (!userPermission) return;

    // Create a new permissions object with the updated value
    const updatedPermission = {
      canView: action === 'view' ? value : userPermission.permission.canView,
      canCreate: action === 'create' ? value : userPermission.permission.canCreate,
      canEdit: action === 'edit' ? value : userPermission.permission.canEdit,
      canDelete: action === 'delete' ? value : userPermission.permission.canDelete,
    };
    
    // Automatically enable view if any other permission is enabled
    if (value && action !== 'view') {
      updatedPermission.canView = true;
    }
    
    // If view is being disabled, disable all other permissions
    if (action === 'view' && !value) {
      updatedPermission.canCreate = false;
      updatedPermission.canEdit = false;
      updatedPermission.canDelete = false;
    }

    // Update the local state only
    setUsersWithPermissions(prev => 
      prev.map(up => up.userId === userId 
        ? { ...up, permission: { ...up.permission, ...updatedPermission } } 
        : up
      )
    );
    
    // Set the hasChanges flag
    setHasChanges(true);
  };
  
  // New method to save all permission changes
  const saveAllPermissions = async () => {
    if (!hasChanges) return;
    
    try {
      setSavingPermissions(true);
      
      // Find all users with changes
      const updates = [];
      
      for (const currentUser of usersWithPermissions) {
        const originalUser = originalPermissions.find(up => up.userId === currentUser.userId);
        if (!originalUser) continue;
        
        const currentPermission = currentUser.permission;
        const originalPermission = originalUser.permission;
        
        // Check if permissions have changed
        if (
          currentPermission.canView !== originalPermission.canView ||
          currentPermission.canCreate !== originalPermission.canCreate ||
          currentPermission.canEdit !== originalPermission.canEdit ||
          currentPermission.canDelete !== originalPermission.canDelete
        ) {
          // Add to the list of updates
          updates.push({
            userId: currentUser.userId,
            permission: {
              view: currentPermission.canView,
              create: currentPermission.canCreate,
              edit: currentPermission.canEdit,
              delete: currentPermission.canDelete
            }
          });
        }
      }
      
      // Process all updates
      if (updates.length > 0) {
        const updatePromises = updates.map(update => 
          permissionsService.updatePermission(
            update.userId,
            activeModule,
            update.permission
          )
        );
        
        await Promise.all(updatePromises);
        
        toast.success('Permissions updated successfully');
        
        // After successful save, update the original permissions
        setOriginalPermissions(JSON.parse(JSON.stringify(usersWithPermissions)));
        setHasChanges(false);
      } else {
        toast.info('No changes to save');
      }
    } catch {
      toast.error('Failed to update permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Permissions</CardTitle>
        <CardDescription>
          Manage what features each team member can access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeModule} onValueChange={(value) => handleModuleChange(value as PermissionModuleType)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-6">
            {Object.values(PermissionModuleType).map((module) => (
              <TabsTrigger key={module} value={module} className="text-xs">
                {moduleInfo[module].name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={activeModule}>
            <div className="mb-4 pb-4 border-b flex justify-between items-start">
              <div>
                <h3 className="font-medium">{moduleInfo[activeModule].name}</h3>
                <p className="text-sm text-muted-foreground">{moduleInfo[activeModule].description}</p>
              </div>
              <Button 
                onClick={saveAllPermissions}
                disabled={!hasChanges || savingPermissions}
                className="flex items-center gap-1"
              >
                {savingPermissions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
            
            {hasChanges && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm flex justify-between items-center">
                <span>You have unsaved permission changes. Click Save Changes to apply them.</span>
                <Button variant="ghost" size="sm" onClick={saveAllPermissions} disabled={savingPermissions}>
                  {savingPermissions ? 'Saving...' : 'Save Now'}
                </Button>
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-md border">
                  <table className="w-full caption-bottom">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Team Member
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                          View
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                          Create
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                          Edit
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {usersWithPermissions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            No staff members found
                          </td>
                        </tr>
                      ) : (
                        usersWithPermissions.map(({ userId, user, permission }) => (
                          <tr key={userId} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle">
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </td>
                            <td className="p-4 align-middle text-center">
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={permission.canView}
                                  disabled={savingPermissions}
                                  onCheckedChange={(checked) => handlePermissionChange(userId, 'view', !!checked)}
                                />
                              </div>
                            </td>
                            <td className="p-4 align-middle text-center">
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={permission.canCreate}
                                  disabled={savingPermissions || !permission.canView}
                                  onCheckedChange={(checked) => handlePermissionChange(userId, 'create', !!checked)}
                                />
                              </div>
                            </td>
                            <td className="p-4 align-middle text-center">
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={permission.canEdit}
                                  disabled={savingPermissions || !permission.canView}
                                  onCheckedChange={(checked) => handlePermissionChange(userId, 'edit', !!checked)}
                                />
                              </div>
                            </td>
                            <td className="p-4 align-middle text-center">
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={permission.canDelete}
                                  disabled={savingPermissions || !permission.canView}
                                  onCheckedChange={(checked) => handlePermissionChange(userId, 'delete', !!checked)}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-muted p-4 rounded-md text-sm">
                  <p className="font-semibold mb-2">Permission Explanations:</p>
                  <ul className="space-y-1">
                    <li><span className="font-medium">View:</span> Can access and view content in this module</li>
                    <li><span className="font-medium">Create:</span> Can create new items in this module</li>
                    <li><span className="font-medium">Edit:</span> Can modify existing items in this module</li>
                    <li><span className="font-medium">Delete:</span> Can delete items in this module</li>
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
