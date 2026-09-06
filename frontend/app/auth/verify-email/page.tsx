"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle, AlertCircle, RefreshCw, Building } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"
import { brandConfig } from "@/lib/brand-config"

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [isValidToken, setIsValidToken] = useState(true)

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (token) {
      handleVerify()
    } else {
      setIsValidToken(false)
      setError("Invalid or missing verification token")
    }
  }, [token])

  const handleVerify = async () => {
    if (!token) {
      setError("Invalid verification token")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      await authService.verifyEmail({ token })
      setSuccess("Email verified successfully! Redirecting to dashboard...")
      setIsVerified(true)
      toast.success("Email verified successfully!")
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to verify email. The token may be invalid or expired."
      setError(message)
      toast.error(message)
      setIsValidToken(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    // You'll need to implement getting the email from somewhere
    // This could be from localStorage, URL params, or ask user to enter it
    const email = localStorage.getItem('verificationEmail') || ''
    
    if (!email) {
      setError("Email address not found. Please go back to registration.")
      return
    }

    setIsResending(true)
    setError("")
    setSuccess("")

    try {
      await authService.resendVerification({ email })
      setSuccess("Verification email sent! Please check your email.")
      toast.success("Verification email sent!")
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to resend verification email. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{brandConfig.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Verify your email address</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>
              {isVerified ? "Email Verified!" : "Verifying Email..."}
            </CardTitle>
            <CardDescription>
              {token ? (
                isVerified ? (
                  "Your email has been successfully verified. You will be redirected shortly."
                ) : (
                  "We're verifying your email address. Please wait..."
                )
              ) : (
                "Click the verification link in your email or use the button below to resend."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {!isVerified && !token && (
                <Button onClick={handleVerify} className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>
              )}
            </div>

            {!isVerified && (
              <div className="mt-6 text-center space-y-4">
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Didn't receive the email? </span>
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="text-primary hover:underline disabled:text-gray-400 disabled:no-underline"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="inline h-3 w-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Resend verification email"
                    )}
                  </button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Back to login
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
