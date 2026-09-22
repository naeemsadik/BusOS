import type React from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Manrope, Noto_Sans_Bengali } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { CurrencyProvider } from "@/contexts/currency-context"
import { brandConfig } from "@/lib/brand-config"
import ClarityInit from "@/components/clarity"
import { LocaleProvider } from "@/components/locale-provider"
import enMessages from "@/messages/en.json"
import bnMessages from "@/messages/bn.json"

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" })
const bangla = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bangla" })

export const metadata: Metadata = {
  title: brandConfig.name,
  description: brandConfig.tagline,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = cookieStore.get("BUSOS_LOCALE")?.value === "bn" ? "bn" : "en"
  const messages = locale === "bn" ? bnMessages : enMessages

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.variable} ${bangla.variable}`} suppressHydrationWarning>
        <LocaleProvider locale={locale} messages={messages}>
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
        </LocaleProvider>
        <ClarityInit projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID} />
      </body>
    </html>
  )
}
