import "@/lib/storage-polyfill";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Kiduka Labs",
    default: "Kiduka Labs - AI-Powered Soil Analysis & Agriculture",
  },
  description:
    "Revolutionizing Kenyan agriculture with AI-powered soil analysis. Get instant nutrient insights, crop recommendations, and optimize your farm's productivity.",
  keywords: [
    "soil analysis",
    "agriculture",
    "Kenya",
    "farming",
    "AI agriculture",
    "crop recommendations",
    "fertilizer optimization",
    "Kiduka Labs",
  ],
  authors: [{ name: "Kiduka Team" }],
  creator: "Kiduka Labs",
  publisher: "Kiduka Labs",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Kiduka Labs - AI-Powered Soil Analysis",
    description:
      "Transform your farming with data-driven soil insights. Instant analysis, personalized recommendations, and expert guides.",
    url: "https://kiduka-labs.co.ke",
    siteName: "Kiduka Labs",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kiduka Labs - AI Soil Analysis",
    description: "The future of smart farming in Kenya.",
    creator: "@kidukalabs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}