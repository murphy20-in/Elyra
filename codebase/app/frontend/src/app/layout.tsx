import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elyra — A safer way to connect",
  description:
    "Privacy-first dating platform for the LGBTQIA+ community in India",
  openGraph: {
    title: "Elyra — A safer way to connect",
    description:
      "Privacy-first dating platform for the LGBTQIA+ community in India",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider
          locale="en"
          messages={require("./i18n/locales/en.json")}
        >
          <Toaster position="top-right" />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}