import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import PwaRegister from "@/components/pwa-register";
import StagingBanner from "@/components/staging-banner";
import "./globals.css";

const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: isStaging ? "Questify STG" : "Questify",
  description: isStaging ? "STAGING — Gamified task tracker" : "Gamified task tracker",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: isStaging ? "#eab308" : "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content={isStaging ? "#eab308" : "#6366f1"} />
        <link rel="icon" href={isStaging ? "/favicon-staging.svg" : "/favicon.ico"} />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="min-h-full flex flex-col">
        <StagingBanner />
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
