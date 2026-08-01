import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { UnitProvider } from "@/components/UnitProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baseweight — packs, trips, and trail lessons",
  description:
    "Build pack lists, assign trips when you need them, journal what worked, and run trail gap checks — with oz/g toggle and shareable packs.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <UnitProvider>{children}</UnitProvider>
      </body>
    </html>
  );
}
