export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  organizationId?: string;
  organization?: Organization;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  logo?: string;
  isActive: boolean;
  subscription?: Subscription;
  createdAt: string;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price?: number;
  currency?: string;
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  hasUsedTrial: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  organization: Organization;
  invitedBy: User;
  createdAt: string;
}

export enum UserRole {
  OWNER = 'owner',
  STAFF = 'staff',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export enum SubscriptionPlan {
  TRIAL = 'trial',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

// API Request/Response Types
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
}

export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
}

export interface Admin {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  ownerCount: number;
  staffCount: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  smsBalance?: number;
  smsBalanceStatus?: 'healthy' | 'low' | 'critical';
  monthlySMSSent?: number;
  todaySMSSent?: number;
}

export interface AdminSubscriptionAnalytics {
  subscriptionsByPlan: Array<{ plan: string; count: number }>;
  subscriptionsByStatus: Array<{ status: string; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  planRevenue: Array<{ plan: string; count: number; revenue: number }>;
}

export interface AdminOrganizationItem {
  id: string;
  name: string;
  email: string;
  userCount: number;
  ownerCount: number;
  staffCount: number;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    endDate: string;
    price: number;
  } | null;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  organization: {
    id: string;
    name: string;
  } | null;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminSubscriptionItem {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  organization: {
    id: string;
    name: string;
  };
  createdAt: string;
}

// Admin API Request/Response Types
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  admin: Admin;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateAdminRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangeAdminPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Subscription Management Types
export interface CreateSubscriptionRequest {
  organizationId: string;
  plan: SubscriptionPlan;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionRequest {
  plan?: SubscriptionPlan;
  endDate?: string;
  autoRenew?: boolean;
}

// SMS Analytics Types
export interface AdminSmsAnalytics {
  totalSmsPackagesSold: number;
  totalSmsRevenue: number;
  totalSmsSent: number;
  monthlySmsRevenue: Array<{
    month: string;
    revenue: number;
    smsCount: number;
  }>;
  topSmsOrganizations: Array<{
    organizationName: string;
    totalSpent: number;
    smsUsed: number;
  }>;
}
