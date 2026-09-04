'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminService } from '../../lib/admin-service';
import { formatLocalDate } from '../../lib/date-utils';
import { getSubscriptionStatusBadgeClass } from '../../lib/subscription-utils';
import {
  AdminSubscriptionItem,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Plus, Edit, Eye, RefreshCw, Settings, Trash2 } from 'lucide-react';

interface SubscriptionPlanData {
  id: string;
  name: string;
  planType: SubscriptionPlan;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  maxUsers: number | null;
  maxInventoryItems: number | null;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CreatePlanForm {
  name: string;
  planType: SubscriptionPlan;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  maxUsers?: number;
  maxInventoryItems?: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

export default function SubscriptionManagementPage() {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanData[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanData | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscriptionItem | null>(null);
  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false);
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);
  const [deletePlanDialogOpen, setDeletePlanDialogOpen] = useState(false);
  const [editSubscriptionDialogOpen, setEditSubscriptionDialogOpen] = useState(false);
  const [deleteSubscriptionDialogOpen, setDeleteSubscriptionDialogOpen] = useState(false);
  const [viewSubscriptionDialogOpen, setViewSubscriptionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');

  // Pagination for subscriptions
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Form data for creating plans
  const [createPlanForm, setCreatePlanForm] = useState<CreatePlanForm>({
    name: '',
    planType: SubscriptionPlan.BASIC,
    description: '',
    price: 0,
    currency: 'USD',
    durationDays: 30,
    features: [],
    isActive: true,
    isPopular: false,
    sortOrder: 0,
  });

  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    loadData();
  }, [page, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'plans') {
        const plans = await adminService.getAllSubscriptionPlans();
        setSubscriptionPlans(plans);
      } else {
        const subscriptionsData = await adminService.getSubscriptions(page, limit);
        setSubscriptions(subscriptionsData.subscriptions);
        setTotalPages(subscriptionsData.totalPages);
      }
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!createPlanForm.name || !createPlanForm.planType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await adminService.createSubscriptionPlan(createPlanForm);

      toast.success('Subscription plan created successfully');
      setCreatePlanDialogOpen(false);
      setCreatePlanForm({
        name: '',
        planType: SubscriptionPlan.BASIC,
        description: '',
        price: 0,
        currency: 'USD',
        durationDays: 30,
        features: [],
        isActive: true,
        isPopular: false,
        sortOrder: 0,
      });
      await loadData();
    } catch (error: any) {
      toast.error('Failed to create subscription plan');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePlanStatus = async (planId: string) => {
    try {
      await adminService.togglePlanStatus(planId);
      toast.success('Plan status updated successfully');
      await loadData();
    } catch (error: any) {
      toast.error('Failed to update plan status');
    }
  };

  const handleInitDefaultPlans = async () => {
    try {
      await adminService.initializeDefaultPlans();
      toast.success('Default plans initialized successfully');
      await loadData();
    } catch (error: any) {
      toast.error('Failed to initialize default plans');
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setCreatePlanForm({
        ...createPlanForm,
        features: [...createPlanForm.features, newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setCreatePlanForm({
      ...createPlanForm,
      features: createPlanForm.features.filter((_, i) => i !== index),
    });
  };

  const openViewSubscription = async (subscription: AdminSubscriptionItem) => {
    try {
      const details = await adminService.getSubscriptionDetails(subscription.id);
      setSelectedSubscription(details);
      setViewSubscriptionDialogOpen(true);
    } catch (error: any) {
      toast.error('Failed to load subscription details');
    }
  };

  const openEditSubscription = async (subscription: AdminSubscriptionItem) => {
    try {
      const details = await adminService.getSubscriptionDetails(subscription.id);
      setSelectedSubscription(details);
      setEditSubscriptionDialogOpen(true);
    } catch (error: any) {
      toast.error('Failed to load subscription details');
    }
  };

  const openDeleteSubscription = (subscription: AdminSubscriptionItem) => {
    setSelectedSubscription(subscription);
    setDeleteSubscriptionDialogOpen(true);
  };

  const openEditPlan = (plan: SubscriptionPlanData) => {
    setSelectedPlan(plan);
    setEditPlanDialogOpen(true);
  };

  const openDeletePlan = (plan: SubscriptionPlanData) => {
    setSelectedPlan(plan);
    setDeletePlanDialogOpen(true);
  };

  const handleUpdatePlan = async (updateData: Partial<SubscriptionPlanData>) => {
    if (!selectedPlan) return;
    
    setUpdating(true);
    try {
      // Transform the data to match the expected API types
      const transformedData = {
        ...updateData,
        // Convert null to undefined for properties that don't accept null
        maxUsers: updateData.maxUsers === null ? undefined : updateData.maxUsers,
        maxInventoryItems: updateData.maxInventoryItems === null ? undefined : updateData.maxInventoryItems,
      };
      
      await adminService.updateSubscriptionPlan(selectedPlan.id, transformedData);
      toast.success('Plan updated successfully');
      setEditPlanDialogOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error('Failed to update plan');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    
    setDeleting(true);
    try {
      await adminService.deleteSubscriptionPlan(selectedPlan.id);
      toast.success('Plan deleted successfully');
      setDeletePlanDialogOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error('Failed to delete plan');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateSubscription = async (updateData: { plan?: SubscriptionPlan; endDate?: string; autoRenew?: boolean }) => {
    if (!selectedSubscription) return;
    
    setUpdating(true);
    try {
      await adminService.updateSubscription(selectedSubscription.id, updateData);
      toast.success('Subscription updated successfully');
      setEditSubscriptionDialogOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error('Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!selectedSubscription) return;
    
    setDeleting(true);
    try {
      await adminService.deleteSubscription(selectedSubscription.id);
      toast.success('Subscription deleted successfully');
      setDeleteSubscriptionDialogOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error('Failed to delete subscription');
    } finally {
      setDeleting(false);
    }
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    switch (plan) {
      case SubscriptionPlan.TRIAL:
        return 'bg-gray-100 text-gray-800';
      case SubscriptionPlan.BASIC:
        return 'bg-blue-100 text-blue-800';
      case SubscriptionPlan.PREMIUM:
        return 'bg-purple-100 text-purple-800';
      case SubscriptionPlan.ENTERPRISE:
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600">Create and manage subscription plans that users can purchase</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {activeTab === 'plans' && (
            <>
              <Button onClick={handleInitDefaultPlans} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Init Default Plans
              </Button>
              <Dialog open={createPlanDialogOpen} onOpenChange={setCreatePlanDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Subscription Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Plan Name</Label>
                        <Input
                          id="name"
                          value={createPlanForm.name}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, name: e.target.value })}
                          placeholder="e.g. Premium Plan"
                        />
                      </div>
                      <div>
                        <Label htmlFor="planType">Plan Type</Label>
                        <Select
                          value={createPlanForm.planType}
                          onValueChange={(value) => setCreatePlanForm({ ...createPlanForm, planType: value as SubscriptionPlan })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SubscriptionPlan.TRIAL}>Trial</SelectItem>
                            <SelectItem value={SubscriptionPlan.BASIC}>Basic</SelectItem>
                            <SelectItem value={SubscriptionPlan.PREMIUM}>Premium</SelectItem>
                            <SelectItem value={SubscriptionPlan.ENTERPRISE}>Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={createPlanForm.description}
                        onChange={(e) => setCreatePlanForm({ ...createPlanForm, description: e.target.value })}
                        placeholder="Plan description"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          type="number"
                          value={createPlanForm.price}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, price: parseFloat(e.target.value) })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={createPlanForm.currency}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, currency: e.target.value })}
                          placeholder="USD"
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (Days)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={createPlanForm.durationDays}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, durationDays: parseInt(e.target.value) })}
                          placeholder="30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maxUsers">Max Users (Optional)</Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          value={createPlanForm.maxUsers || ''}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, maxUsers: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxItems">Max Inventory Items (Optional)</Label>
                        <Input
                          id="maxItems"
                          type="number"
                          value={createPlanForm.maxInventoryItems || ''}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, maxInventoryItems: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="Unlimited"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Features</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature"
                          onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        />
                        <Button type="button" onClick={addFeature} variant="outline">
                          Add
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {createPlanForm.features.map((feature, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{feature}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFeature(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={createPlanForm.isActive}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, isActive: e.target.checked })}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPopular"
                          checked={createPlanForm.isPopular}
                          onChange={(e) => setCreatePlanForm({ ...createPlanForm, isPopular: e.target.checked })}
                        />
                        <Label htmlFor="isPopular">Popular</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        value={createPlanForm.sortOrder}
                        onChange={(e) => setCreatePlanForm({ ...createPlanForm, sortOrder: parseInt(e.target.value) })}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setCreatePlanDialogOpen(false)}
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePlan} disabled={creating}>
                        {creating ? 'Creating...' : 'Create Plan'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'plans' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('plans')}
        >
          Subscription Plans
        </Button>
        <Button
          variant={activeTab === 'subscriptions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('subscriptions')}
        >
          Active Subscriptions
        </Button>
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Manage subscription plans that users can purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative border rounded-lg p-6 ${plan.isPopular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <Badge className={getPlanColor(plan.planType)}>
                      {plan.planType}
                    </Badge>
                    <div className="mt-4 mb-6">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-gray-500">/{plan.durationDays} days</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {plan.maxUsers && (
                      <div>Max Users: {plan.maxUsers}</div>
                    )}
                    {plan.maxInventoryItems && (
                      <div>Max Items: {plan.maxInventoryItems}</div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePlanStatus(plan.id)}
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                    
                    {/* Edit and Delete buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditPlan(plan)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeletePlan(plan)}
                        className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {subscriptionPlans.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No subscription plans found.</p>
                <Button onClick={handleInitDefaultPlans} className="mt-4">
                  Initialize Default Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              View all user subscriptions and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Auto Renew</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">
                      {subscription.organization.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanColor(subscription.plan)}>
                        {subscription.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSubscriptionStatusBadgeClass(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatLocalDate(subscription.startDate)}</TableCell>
                    <TableCell>{formatLocalDate(subscription.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={subscription.autoRenew ? 'default' : 'secondary'}>
                        {subscription.autoRenew ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewSubscription(subscription)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSubscription(subscription)}
                          title="Edit Subscription"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteSubscription(subscription)}
                          title="Delete Subscription"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}

            {subscriptions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No active subscriptions found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Subscription Dialog */}
      <Dialog open={viewSubscriptionDialogOpen} onOpenChange={setViewSubscriptionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Organization</Label>
                  <p>{selectedSubscription.organization.name}</p>
                </div>
                <div>
                  <Label className="font-medium">Plan</Label>
                  <Badge className={getPlanColor(selectedSubscription.plan)}>
                    {selectedSubscription.plan}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Status</Label>
                  <Badge className={getSubscriptionStatusBadgeClass(selectedSubscription.status)}>
                    {selectedSubscription.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Price</Label>
                  <p>${selectedSubscription.price}/month</p>
                </div>
                <div>
                  <Label className="font-medium">Start Date</Label>
                  <p>{formatLocalDate(selectedSubscription.startDate)}</p>
                </div>
                <div>
                  <Label className="font-medium">End Date</Label>
                  <p>{formatLocalDate(selectedSubscription.endDate)}</p>
                </div>
                {selectedSubscription.trialEndDate && (
                  <div>
                    <Label className="font-medium">Trial End Date</Label>
                    <p>{formatLocalDate(selectedSubscription.trialEndDate)}</p>
                  </div>
                )}
                <div>
                  <Label className="font-medium">Auto Renew</Label>
                  <Badge variant={selectedSubscription.autoRenew ? 'default' : 'secondary'}>
                    {selectedSubscription.autoRenew ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Created</Label>
                  <p>{formatLocalDate(selectedSubscription.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={editSubscriptionDialogOpen} onOpenChange={setEditSubscriptionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div>
                <Label className="font-medium text-sm text-gray-600">Organization</Label>
                <p className="font-medium">{selectedSubscription.organization.name}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="editPlan">Plan Type</Label>
                  <Select
                    value={selectedSubscription.plan}
                    onValueChange={(value) => {
                      setSelectedSubscription({
                        ...selectedSubscription,
                        plan: value as SubscriptionPlan
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SubscriptionPlan.TRIAL}>Trial</SelectItem>
                      <SelectItem value={SubscriptionPlan.BASIC}>Basic</SelectItem>
                      <SelectItem value={SubscriptionPlan.PREMIUM}>Premium</SelectItem>
                      <SelectItem value={SubscriptionPlan.ENTERPRISE}>Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editEndDate">End Date</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={selectedSubscription.endDate ? new Date(selectedSubscription.endDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      setSelectedSubscription({
                        ...selectedSubscription,
                        endDate: e.target.value
                      });
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editAutoRenew"
                    checked={selectedSubscription.autoRenew}
                    onChange={(e) => {
                      setSelectedSubscription({
                        ...selectedSubscription,
                        autoRenew: e.target.checked
                      });
                    }}
                  />
                  <Label htmlFor="editAutoRenew">Auto Renew</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditSubscriptionDialogOpen(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateSubscription({
                    plan: selectedSubscription.plan,
                    endDate: selectedSubscription.endDate,
                    autoRenew: selectedSubscription.autoRenew
                  })}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Update Subscription'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Subscription Dialog */}
      <Dialog open={deleteSubscriptionDialogOpen} onOpenChange={setDeleteSubscriptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. Deleting this subscription will:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• Remove all subscription data</li>
                  <li>• Revoke access to premium features</li>
                  <li>• Cannot be recovered</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium">Organization:</Label>
                <p className="text-sm text-gray-600">{selectedSubscription.organization.name}</p>
                
                <Label className="font-medium">Plan:</Label>
                <Badge className={getPlanColor(selectedSubscription.plan)}>
                  {selectedSubscription.plan}
                </Badge>
                
                <Label className="font-medium">Status:</Label>
                <Badge className={getSubscriptionStatusBadgeClass(selectedSubscription.status)}>
                  {selectedSubscription.status}
                </Badge>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteSubscriptionDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSubscription}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Subscription'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPlanName">Plan Name</Label>
                  <Input
                    id="editPlanName"
                    value={selectedPlan.name}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        name: e.target.value
                      });
                    }}
                    placeholder="e.g. Premium Plan"
                  />
                </div>
                <div>
                  <Label htmlFor="editPlanType">Plan Type</Label>
                  <Select
                    value={selectedPlan.planType}
                    onValueChange={(value) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        planType: value as SubscriptionPlan
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SubscriptionPlan.TRIAL}>Trial</SelectItem>
                      <SelectItem value={SubscriptionPlan.BASIC}>Basic</SelectItem>
                      <SelectItem value={SubscriptionPlan.PREMIUM}>Premium</SelectItem>
                      <SelectItem value={SubscriptionPlan.ENTERPRISE}>Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={selectedPlan.description}
                  onChange={(e) => {
                    setSelectedPlan({
                      ...selectedPlan,
                      description: e.target.value
                    });
                  }}
                  placeholder="Plan description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editPrice">Price</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    value={selectedPlan.price}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        price: parseFloat(e.target.value) || 0
                      });
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="editCurrency">Currency</Label>
                  <Input
                    id="editCurrency"
                    value={selectedPlan.currency}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        currency: e.target.value
                      });
                    }}
                    placeholder="USD"
                  />
                </div>
                <div>
                  <Label htmlFor="editDuration">Duration (Days)</Label>
                  <Input
                    id="editDuration"
                    type="number"
                    value={selectedPlan.durationDays}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        durationDays: parseInt(e.target.value) || 30
                      });
                    }}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMaxUsers">Max Users (Optional)</Label>
                  <Input
                    id="editMaxUsers"
                    type="number"
                    value={selectedPlan.maxUsers || ''}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        maxUsers: e.target.value ? parseInt(e.target.value) : null
                      });
                    }}
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <Label htmlFor="editMaxItems">Max Inventory Items (Optional)</Label>
                  <Input
                    id="editMaxItems"
                    type="number"
                    value={selectedPlan.maxInventoryItems || ''}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        maxInventoryItems: e.target.value ? parseInt(e.target.value) : null
                      });
                    }}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <Label>Features</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newFeature.trim()) {
                          setSelectedPlan({
                            ...selectedPlan,
                            features: [...selectedPlan.features, newFeature.trim()]
                          });
                          setNewFeature('');
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (newFeature.trim()) {
                        setSelectedPlan({
                          ...selectedPlan,
                          features: [...selectedPlan.features, newFeature.trim()]
                        });
                        setNewFeature('');
                      }
                    }} 
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPlan({
                            ...selectedPlan,
                            features: selectedPlan.features.filter((_, i) => i !== index)
                          });
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editPlanActive"
                    checked={selectedPlan.isActive}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        isActive: e.target.checked
                      });
                    }}
                  />
                  <Label htmlFor="editPlanActive">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editPlanPopular"
                    checked={selectedPlan.isPopular}
                    onChange={(e) => {
                      setSelectedPlan({
                        ...selectedPlan,
                        isPopular: e.target.checked
                      });
                    }}
                  />
                  <Label htmlFor="editPlanPopular">Popular</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="editSortOrder">Sort Order</Label>
                <Input
                  id="editSortOrder"
                  type="number"
                  value={selectedPlan.sortOrder}
                  onChange={(e) => {
                    setSelectedPlan({
                      ...selectedPlan,
                      sortOrder: parseInt(e.target.value) || 0
                    });
                  }}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditPlanDialogOpen(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdatePlan({
                    name: selectedPlan.name,
                    planType: selectedPlan.planType,
                    description: selectedPlan.description,
                    price: selectedPlan.price,
                    currency: selectedPlan.currency,
                    durationDays: selectedPlan.durationDays,
                    features: selectedPlan.features,
                    maxUsers: selectedPlan.maxUsers,
                    maxInventoryItems: selectedPlan.maxInventoryItems,
                    isActive: selectedPlan.isActive,
                    isPopular: selectedPlan.isPopular,
                    sortOrder: selectedPlan.sortOrder
                  })}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Update Plan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog open={deletePlanDialogOpen} onOpenChange={setDeletePlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subscription Plan</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. Deleting this plan will:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• Remove the plan permanently</li>
                  <li>• Affect existing subscriptions using this plan</li>
                  <li>• Cannot be recovered</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium">Plan Name:</Label>
                <p className="text-sm text-gray-600">{selectedPlan.name}</p>
                
                <Label className="font-medium">Plan Type:</Label>
                <Badge className={getPlanColor(selectedPlan.planType)}>
                  {selectedPlan.planType}
                </Badge>
                
                <Label className="font-medium">Price:</Label>
                <p className="text-sm text-gray-600">${selectedPlan.price}</p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeletePlanDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeletePlan}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Plan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
