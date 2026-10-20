import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../assets/globals.css";
import NotificationBell from "@/components/dashboard/notification-bell";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmHost } from '@/components/ui/confirm'
import { TooltipProvider } from "@/components/ui/overlay";

// Geist is the portal's font (UI revamp). It replaced Inter in phase 1.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Access Oxbridge | Portal",
  description: "Your gateway to the world of Oxbridge admissions.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Access Oxbridge | Portal",
    description: "Your gateway to the world of Oxbridge admissions.",
    url: "/",
  },
  alternates: {
    canonical: "/",
  },
};

// `viewportFit: 'cover'` is what makes `env(safe-area-inset-*)` resolve to real
// values — the mobile tab bar relies on it for home-indicator clearance.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#13275a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-density: "comfortable" for students, mentors and public pages;
    // DashboardShell switches it to "compact" on admin pages. It lives on
    // <html> so dialogs and menus (rendered at the end of <body>) follow it.
    <html
      lang="en"
      data-density="comfortable"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background font-sans text-foreground antialiased">
        <TooltipProvider>
          <NotificationBell />
          {children}
          <Toaster />
          <ConfirmHost />
        </TooltipProvider>
      </body>
    </html>
  );
}
