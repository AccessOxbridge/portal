import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "../assets/globals.css";
import NotificationBell from "@/components/dashboard/notification-bell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// UI revamp: Geist is loaded for the new components (font-ui) and becomes the
// default font in phase 1. Until then Inter stays the default.
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
  themeColor: "#092c68",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistSans.variable} ${geistMono.variable}`}>
      <body
        className="font-sans antialiased"
      >
        <NotificationBell />
        {children}
      </body>
    </html>
  );
}
