import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/lib/providers";
import { HelpButton } from "@/components/ui/help-dialog";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Mandara · Policy-Governed AI Agent Wallets", template: "%s · Mandara" },
  description: "Give AI agents signing power without giving them unlimited wallet control. Mandara is a devnet beta control plane for policy-governed AI agent wallets, powered by HumanRail guardrails and Ika dWallet signing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <AppProviders>
            {children}
            <HelpButton />
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
