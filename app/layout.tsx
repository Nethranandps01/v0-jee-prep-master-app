import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "JEE Prep Master - AI-Powered JEE Mastery",
  description:
    "Ace JEE Main & Advanced with AI-powered test preparation, smart papers, personalized feedback, and comprehensive study materials.",
  generator: "v0.app",
};

export const viewport: Viewport = {
  themeColor: "#2D6FD2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
