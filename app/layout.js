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
  manifest: "/manifest.json?v=3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mutants Academy",
    startupImage: [
      "/icons/apple-splash.png",
      {
        url: "/icons/apple-splash-1290-2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-1179-2556.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-1170-2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-828-1792.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-splash-750-1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`} style={{ backgroundColor: "#ffffff" }}>
      <head>
        <link rel="manifest" href="/manifest.json?v=3" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash.png" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1290-2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1179-2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1170-2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-828-1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-750-1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mutants Academy" />
        <meta name="theme-color" content="#ffffff" />
        <style>{`
          :root, html {
            background-color: #ffffff;
            color-scheme: light;
          }
          html.dark {
            background-color: #09090b;
            color-scheme: dark;
          }
          body {
            background-color: #ffffff;
          }
          html.dark body {
            background-color: #09090b;
          }
        `}</style>
      </head>
      <body className="min-h-full font-sans antialiased bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200" style={{ backgroundColor: "#ffffff" }}>
        <ThemeProvider>
          {children}
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
