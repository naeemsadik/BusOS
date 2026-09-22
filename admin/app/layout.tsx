import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Manrope, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "../contexts/admin-context";
import { ThemeProvider } from "../contexts/theme-context";
import { AdminCurrencyProvider } from "../contexts/currency-context";
import { LocaleProvider } from "../components/locale-provider";
import enMessages from "../messages/en.json";
import bnMessages from "../messages/bn.json";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const bangla = Noto_Sans_Bengali({ variable: "--font-bangla", subsets: ["bengali"] });

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
      <body className={`${manrope.variable} ${bangla.variable} antialiased`}>
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
