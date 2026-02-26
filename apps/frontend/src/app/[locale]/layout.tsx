import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const nunitoSans = Nunito_Sans({variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collector Shop",
  description: "The premium shop for collectors",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  // Fetch session server-side
  let initialSession = null;
  try {
    const cookieStore = await cookies();
    const headers = new Headers();
    if (cookieStore.toString()) {
      headers.set("cookie", cookieStore.toString());
    }

    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    console.log(apiUrl)
    const res = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      initialSession = await res.json();
    }
  } catch (err) {
    console.error("Error fetching initial session:", err);
  }

  return (
    <html lang={locale} className={nunitoSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground font-sans`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider initialSession={initialSession}>
            <Navbar />
            <main>
              {children}
            </main>
            <Toaster />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

