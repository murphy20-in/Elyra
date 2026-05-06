import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "../i18n/locales/en.json";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Elyra — A safer way to connect",
  description:
    "Privacy-first dating platform for the LGBTQIA+ community in India",
  applicationName: "Elyra",
  manifest: "/manifest.json",
  openGraph: {
    title: "Elyra — A safer way to connect",
    description:
      "Privacy-first dating platform for the LGBTQIA+ community in India",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-primary"
        >
          Skip to content
        </a>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Toaster position="top-right" />
          <main id="main">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}