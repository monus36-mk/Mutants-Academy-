import { Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Mutants Academy | MMA Gym Portal",
  description: "Advanced Multi-Role Management System for Mutants Academy Coaches & Athletes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mutants Academy",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mutants Academy" />
        <meta name="theme-color" content="#dc2626" />
      </head>
      <body className="min-h-full font-sans antialiased bg-gray-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
        <ThemeProvider>
          {children}
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
