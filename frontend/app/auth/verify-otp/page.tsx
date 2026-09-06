"use client"

import type React from "react"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle, AlertCircle, RefreshCw, Building } from "lucide-react"
import { brandConfig } from "@/lib/brand-config"

function VerifyOTPForm() {
  const searchParams = useSearchParams()
  const purpose = searchParams.get("purpose") || "login" // login, transaction, etc.
  const phone = searchParams.get("phone") || ""

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [canResend, setCanResend] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters

    const newOtp = [...otp]
    newOtp[index] = value

    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newOtp = [...otp]

    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }

    setOtp(newOtp)

    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex((digit) => !digit)
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP")
      setIsLoading(false)
      return
    }

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setSuccess("OTP verified successfully!")

      // Redirect based on purpose
      setTimeout(() => {
        if (purpose === "login") {
          window.location.href = "/"
        } else {
          window.location.href = "/dashboard"
        }
      }, 1500)
    } catch (err) {
      setError("Invalid OTP. Please try again.")
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsResending(true)
    setError("")
    setSuccess("")

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess("New OTP sent successfully!")
      setTimeLeft(120) // Reset timer
      setCanResend(false)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError("Failed to resend OTP. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const getPurposeText = () => {
    switch (purpose) {
      case "login":
        return "login to your account"
      case "transaction":
        return "complete your transaction"
      case "password-reset":
        return "reset your password"
      default:
        return "verify your identity"
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
          <p className="text-gray-600 dark:text-gray-400">Two-Factor Authentication</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>Enter OTP Code</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to{" "}
              {phone ? `***-***-${phone.slice(-4)}` : "your registered phone number"} to {getPurposeText()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
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

              <div className="space-y-4">
                <div className="flex justify-center space-x-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-12 h-12 text-center text-xl font-semibold"
                      disabled={isLoading}
                    />
                  ))}
                </div>

                <div className="text-center text-sm text-gray-600">
                  {timeLeft > 0 ? (
                    <p>Code expires in {formatTime(timeLeft)}</p>
                  ) : (
                    <p className="text-red-600">OTP has expired</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || otp.join("").length !== 6}>
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <div className="text-sm">
                <span className="text-gray-600">Didn't receive the code? </span>
                <button
                  onClick={handleResendOtp}
                  disabled={!canResend || isResending}
                  className="text-primary hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="inline h-3 w-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-600">
                <Link href="/auth/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">For security reasons, this OTP will expire in {formatTime(timeLeft)}</p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
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
      <VerifyOTPForm />
    </Suspense>
  )
}
