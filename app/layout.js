import { Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Mutants Academy | MMA Admin Dashboard",
  description: "Advanced Multi-Role Management System for Mutants Academy Coaches & Admins",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <body className="min-h-full font-sans antialiased bg-gray-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
