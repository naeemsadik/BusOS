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

export enum PermissionModuleType {
  POS = 'pos',
  INVENTORY = 'inventory',
  CUSTOMERS = 'customers',
  ORDERS = 'orders',
  INVOICES = 'invoices',
  EXPENSES = 'expenses',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  DELIVERY = 'delivery',
  PAYMENTS = 'payments',
  SUPPLIERS = 'suppliers',
  DASHBOARD = 'dashboard',
}

export interface UserPermission {
  id: string;
  userId: string;
  module: PermissionModuleType;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
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

// SMS Types
export interface SmsBalance {
  id: string;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  totalSpent: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsPackage {
  id: string;
  packageNumber: string;
  smsCount: number;
  totalAmount: number;
  pricePerSms: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  organizationId: string;
  bkashPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsLog {
  id: string;
  recipient: string;
  recipientName?: string;
  message: string;
  type: 'promotional' | 'transactional' | 'otp' | 'reminder';
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  cost: number;
  gateway?: string;
  gatewayResponse?: string;
  deliveryReportId?: string;
  deliveredAt?: string;
  failureReason?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsSettings {
  id: string;
  pricePerSms: number;
  minimumPurchase: number;
  maximumPurchase: number;
  lowBalanceThreshold: number;
  criticalBalanceThreshold: number;
  isEnabled: boolean;
  defaultGateway?: string;
  defaultSenderId?: string;
  dailyLimit: number;
  rateLimitPerMinute: number;
  enableDeliveryReports: boolean;
  honorOptOutRequests: boolean;
  sendingStartTime: string;
  sendingEndTime: string;
  restrictSendingHours: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSmsSettings {
  pricePerSms: number;
  minimumPurchase: number;
  maximumPurchase: number;
  isEnabled: boolean;
}

export interface SmsStats {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  totalSpent: number;
  todaySent: number;
  monthlySent: number;
  weeklyStats: Array<{
    date: string;
    sent: number;
    cost: number;
  }>;
}

export interface SmsBalanceStatus {
  balance: number;
  status: 'healthy' | 'low' | 'critical';
  message: string;
}

export interface SmsUsageStats {
  todaySent: number;
  monthlySent: number;
  totalSent: number;
  balance: number;
}

export interface PurchaseSmsRequest {
  type: 'by_count' | 'by_amount';
  smsCount?: number;
  amount?: number;
  notes?: string;
  paymentMethod?: 'bkash' | 'sslcommerz';
  payerReference?: string;
}

export interface PurchaseSmsResponse {
  packageId: string;
  smsCount: number;
  totalAmount: number;
  pricePerSms: number;
  bkashPaymentUrl?: string;
  sslcommerzPaymentUrl?: string;
}

export interface SendSmsRequest {
  recipient: string;
  recipientName?: string;
  message: string;
  type?: string;
  gateway?: string;
}

export interface SendSmsResponse {
  success: boolean;
  messageId: string;
  cost: number;
  remainingBalance: number;
}

export interface BulkSmsRequest {
  recipients: Array<{
    phone: string;
    name?: string;
  }>;
  message: string;
  type?: string;
  gateway?: string;
}

export interface BulkSmsResponse {
  totalSent: number;
  totalFailed: number;
  totalCost: number;
  remainingBalance: number;
  results: Array<{
    recipient: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// Admin SMS Analytics
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

// Updated Dashboard Stats to include SMS
export interface AdminDashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  ownerCount: number;
  staffCount: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  // SMS stats
  smsBalance: number;
  smsBalanceStatus: 'healthy' | 'low' | 'critical';
  todaySMSSent: number;
  monthlySMSSent: number;
}
