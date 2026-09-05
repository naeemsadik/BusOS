"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Building } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"
import { brandConfig } from "@/lib/brand-config"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isValidToken, setIsValidToken] = useState(true)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setIsValidToken(false)
      setError("Invalid or missing reset token")
    }
  }, [token])

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    }
  }

  const passwordValidation = validatePassword(formData.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validation
    if (!passwordValidation.isValid) {
      setError("Password does not meet the requirements")
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (!token) {
      setError("Invalid reset token")
      setIsLoading(false)
      return
    }

    try {
      await authService.resetPassword({
        token,
        password: formData.password,
      })
      setSuccess("Password reset successfully! Redirecting to login...")
      toast.success("Password reset successfully!")
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to reset password. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/auth/forgot-password">
                  <Button className="w-full">Request New Reset Link</Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
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
            <CardTitle>Create new password</CardTitle>
            <CardDescription>Enter a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Requirements */}
                {formData.password && (
                  <div className="space-y-1 text-xs">
                    <div
                      className={`flex items-center ${passwordValidation.minLength ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.minLength ? "bg-green-600" : "bg-red-600"}`}
                      />
                      At least 8 characters
                    </div>
                    <div
                      className={`flex items-center ${passwordValidation.hasUpperCase ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasUpperCase ? "bg-green-600" : "bg-red-600"}`}
                      />
                      One uppercase letter
                    </div>
                    <div
                      className={`flex items-center ${passwordValidation.hasLowerCase ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasLowerCase ? "bg-green-600" : "bg-red-600"}`}
                      />
                      One lowercase letter
                    </div>
                    <div
                      className={`flex items-center ${passwordValidation.hasNumbers ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasNumbers ? "bg-green-600" : "bg-red-600"}`}
                      />
                      One number
                    </div>
                    <div
                      className={`flex items-center ${passwordValidation.hasSpecialChar ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasSpecialChar ? "bg-green-600" : "bg-red-600"}`}
                      />
                      One special character
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !passwordValidation.isValid || formData.password !== formData.confirmPassword}
              >
                {isLoading ? "Resetting password..." : "Reset password"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
