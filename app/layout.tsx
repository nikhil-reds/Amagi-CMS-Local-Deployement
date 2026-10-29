import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "../public/Poppins/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/Poppins/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/Poppins/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/Poppins/Poppins-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const abroSans = localFont({
  src: [
    { path: "../public/AbroSans/OpenType-TT/AbroSans-Thin.ttf", weight: "100", style: "normal" },
    { path: "../public/AbroSans/OpenType-TT/AbroSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/AbroSans/OpenType-TT/AbroSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-abro-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Amagi Multimedia",
  description: "Amagi Multimedia — your platform for managing and viewing media documents.",
};

import { Toaster } from "@/components/ui/sonner"

import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${abroSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
