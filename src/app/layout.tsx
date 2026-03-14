import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeClean - Platform Manajemen Bisnis Laundry #1 di Indonesia",
  description: "VibeClean adalah platform all-in-one untuk mengelola bisnis laundry Anda. Dari POS, manajemen cabang, hingga laporan keuangan dalam satu dashboard.",
  keywords: ["laundry", "manajemen laundry", "pos laundry", "software laundry", "aplikasi laundry"],
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <ThemeProvider defaultTheme="system">
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
