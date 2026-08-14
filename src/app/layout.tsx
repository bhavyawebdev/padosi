import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aas-Paas — Your Neighbourhood Hub",
    template: "%s | Aas-Paas",
  },
  description:
    "Aas-Paas is a hyperlocal community platform connecting neighbours for help, needs, and trusted local discovery.",
  keywords: ["hyperlocal", "community", "neighbourhood", "help", "verified help", "local"],
  authors: [{ name: "Aas-Paas Team" }],
  creator: "Aas-Paas",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Aas-Paas",
    title: "Aas-Paas — Your Neighbourhood Hub",
    description:
      "Connect with your neighbours. Share verified help. Discover what's nearby.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aas-Paas — Your Neighbourhood Hub",
    description:
      "Connect with your neighbours. Share verified help. Discover what's nearby.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#823815",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface text-on-surface antialiased min-h-screen selection:bg-primary/20 selection:text-primary">
        <AuthProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-xl">
            Skip to main content
          </a>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
