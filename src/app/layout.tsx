import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AnyProg — Web-Based CPS for Anytone D578UV",
  description:
    "Edit channels, zones, and settings for your Anytone D578UV right in your browser. No installs, no Windows required. Works on Mac.",
  keywords: [
    "Anytone D578UV",
    "CPS",
    "DMR",
    "codeplug",
    "ham radio",
    "web serial",
    "channel editor",
  ],
  openGraph: {
    title: "AnyProg — Web-Based CPS for Anytone D578UV",
    description:
      "Edit channels, zones, and settings right in your browser. No installs, no Windows required.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
