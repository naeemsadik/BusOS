import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "../contexts/admin-context";
import { ThemeProvider } from "../contexts/theme-context";
import { AdminCurrencyProvider } from "../contexts/currency-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Portal - Inventory POS",
  description: "Administrative dashboard for Inventory POS system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AdminProvider>
            <AdminCurrencyProvider>
              {children}
            </AdminCurrencyProvider>
          </AdminProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
