import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PermissionModuleType, UserRole } from './lib/types';
import { jwtDecode } from 'jwt-decode';

// Define route permissions mapping
const ROUTE_PERMISSIONS: Record<string, { module: PermissionModuleType, action: 'view' | 'create' | 'edit' | 'delete' }> = {
  '/pos': { module: PermissionModuleType.POS, action: 'view' },
  '/dashboard': { module: PermissionModuleType.DASHBOARD, action: 'view' },
  '/inventory': { module: PermissionModuleType.INVENTORY, action: 'view' },
  '/customers': { module: PermissionModuleType.CUSTOMERS, action: 'view' },
  '/orders': { module: PermissionModuleType.ORDERS, action: 'view' },
  '/expenses': { module: PermissionModuleType.EXPENSES, action: 'view' },
  '/reports': { module: PermissionModuleType.REPORTS, action: 'view' },
  '/settings': { module: PermissionModuleType.SETTINGS, action: 'view' },
  '/social-content': { module: PermissionModuleType.SETTINGS, action: 'view' },
  '/delivery': { module: PermissionModuleType.DELIVERY, action: 'view' },
  '/suppliers': { module: PermissionModuleType.SUPPLIERS, action: 'view' },
  '/sms': { module: PermissionModuleType.PAYMENTS, action: 'view' },
  '/subscription': { module: PermissionModuleType.PAYMENTS, action: 'view' },
  '/payments': { module: PermissionModuleType.PAYMENTS, action: 'view' },
};

// Module priority order for redirecting to first permitted page (most common/important modules first)
const MODULE_PRIORITY: PermissionModuleType[] = [
  PermissionModuleType.POS, 
  PermissionModuleType.DASHBOARD,
  PermissionModuleType.INVENTORY,
  PermissionModuleType.ORDERS,
  PermissionModuleType.CUSTOMERS,
  PermissionModuleType.REPORTS,
  PermissionModuleType.SUPPLIERS,
  PermissionModuleType.EXPENSES,
  PermissionModuleType.DELIVERY,
  PermissionModuleType.SETTINGS,
  PermissionModuleType.PAYMENTS,
];

interface DecodedToken {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  permissions?: { module: string, canView: boolean }[];
  iat: number;
  exp: number;
}

// This middleware runs on the edge
export async function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname;
  
  // Special handling for root path
  if (path === '/') {
    // For root path, let the component handle routing
    // This allows showing landing page for unauthenticated users
    // and auto-redirecting authenticated users in the component
    return NextResponse.next();
  }
  
  // Skip checking for excluded paths
  if (path.startsWith('/auth') || 
      path.startsWith('/api') || 
      path.startsWith('/backend-api') ||
      path.startsWith('/_next') ||
      path === '/access-denied') {
    return NextResponse.next();
  }

  // Get the token from the request
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    // Redirect to login if there is no token
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Decode token to get user info
    const decodedToken = jwtDecode<DecodedToken>(token);
    
    // Token expired
    if (decodedToken.exp * 1000 < Date.now()) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Owners and admins always have access to all modules
    if (decodedToken.role === UserRole.OWNER || decodedToken.role === UserRole.ADMIN) {
      return NextResponse.next();
    }

    // For staff users, let client-side handle permission checks
    // This is because permissions aren't in the token and are fetched via API
    if (decodedToken.role === UserRole.STAFF) {
      return NextResponse.next();
    }
    
    // For owners and admins, we already allowed access above
    // This is just a fallback check that shouldn't be reached
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On any error, redirect to login to be safe
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
