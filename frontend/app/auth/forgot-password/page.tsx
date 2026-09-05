"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Building } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"
import { brandConfig } from "@/lib/brand-config"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    try {
      await authService.forgotPassword({ email })
      setSuccess("Password reset instructions have been sent to your email address.")
      setIsSubmitted(true)
      toast.success("Password reset email sent!")
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to send reset instructions. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
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
            <p className="text-gray-600 dark:text-gray-400">Password reset sent</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We've sent password reset instructions to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  If you don't see the email in your inbox, please check your spam folder.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">The reset link will expire in 1 hour for security reasons.</p>

                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setIsSubmitted(false)
                      setEmail("")
                      setSuccess("")
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Try different email
                  </Button>

                  <Link href="/auth/login">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to login
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
      <p className="text-gray-600 dark:text-gray-400">Reset your password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending instructions..." : "Send reset instructions"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm text-primary hover:underline inline-flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
