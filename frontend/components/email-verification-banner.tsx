'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';

interface EmailVerificationBannerProps {
  className?: string;
  showFullDetails?: boolean;
}

export function EmailVerificationBanner({ 
  className = "", 
  showFullDetails = false 
}: EmailVerificationBannerProps) {
  const { user, resendVerification } = useAuth();
  const [resendingVerification, setResendingVerification] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);

  const handleResendVerification = async () => {
    if (!user?.email || resendingVerification) return;
    
    setResendingVerification(true);
    try {
      await resendVerification(user.email);
      setLastSentTime(new Date());
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    } finally {
      setResendingVerification(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  // Don't show banner if user is verified or not logged in
  if (!user) {
    return null;
  }
    // Explicitly check if email is verified
  if (user.isEmailVerified === true) {
    
    return null;
  }




  if (showFullDetails) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-6 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Verify Your Email Address</h3>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 w-fit">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              We've sent a verification email to <strong className="break-all">{user.email}</strong>. 
              Please check your inbox and click the verification link to activate all features.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                size="sm"
              >
                {resendingVerification ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Email
                  </>
                )}
              </Button>
              
              <Link href="/verify-email-instructions" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Need Help?
                </Button>
              </Link>
              
              {lastSentTime && (
                <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Last sent {getTimeAgo(lastSentTime)}
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>Didn't receive the email?</strong>
              </p>
              <ul className="text-xs sm:text-sm text-blue-700 mt-1 space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure <span className="break-all">{user.email}</span> is correct</li>
                <li>• Try resending the verification email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact version for the dashboard
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <Mail className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <span className="text-blue-800 text-sm mb-2 sm:mb-0">
          Please verify your email address to access all features. Check your inbox for a verification email.
        </span>
        <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-2 xs:space-y-0 xs:space-x-2 sm:ml-4">
          {lastSentTime && (
            <span className="text-xs text-blue-600 order-2 xs:order-1">
              Sent {getTimeAgo(lastSentTime)}
            </span>
          )}
          <div className="flex space-x-2 order-1 xs:order-2">
            <Button
              onClick={handleResendVerification}
              disabled={resendingVerification}
              variant="outline"
              size="sm"
              className="bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 hover:border-blue-400 text-xs h-8"
            >
              {resendingVerification ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Email'
              )}
            </Button>
            <Link href="/verify-email-instructions">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-700 hover:bg-blue-100 text-xs h-8"
              >
                Help
              </Button>
            </Link>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
