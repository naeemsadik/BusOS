import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-bengali";
import "./globals.css";
import { AdminProvider } from "../contexts/admin-context";
import { ThemeProvider } from "../contexts/theme-context";
import { AdminCurrencyProvider } from "../contexts/currency-context";
import { LocaleProvider } from "../components/locale-provider";
import enMessages from "../messages/en.json";
import bnMessages from "../messages/bn.json";

export const metadata: Metadata = {
  title: "Admin Portal - Inventory POS",
  description: "Administrative dashboard for Inventory POS system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("BUSOS_LOCALE")?.value === "bn" ? "bn" : "en";
  const messages = locale === "bn" ? bnMessages : enMessages;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <LocaleProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AdminProvider>
              <AdminCurrencyProvider>{children}</AdminCurrencyProvider>
            </AdminProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
