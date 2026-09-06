import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { CurrencyProvider } from "@/contexts/currency-context"
import { brandConfig } from "@/lib/brand-config"
import ClarityInit from "@/components/clarity"


const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: brandConfig.name,
  description: brandConfig.tagline,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <CurrencyProvider>
                {children}
              </CurrencyProvider>
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
        <ClarityInit projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID} />
      </body>
    </html>
  )
}
