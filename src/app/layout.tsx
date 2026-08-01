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
  title: "Baseweight — pack coach for real trails",
  description:
    "Gear locker, trip packs, trail gap checks, and a community shakedown feed — with oz/g toggle and shareable lists.",
};

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
