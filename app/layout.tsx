import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../assets/globals.css";
import NotificationBell from "@/components/dashboard/notification-bell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Access Oxbridge | Portal",
  description: "Your gateway to the world of Oxbridge admissions.",
  icons: {
    icon: "/logo.webp",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <NotificationBell />
        {children}
      </body>
    </html>
  );
}
