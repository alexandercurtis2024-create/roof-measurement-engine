import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roof Measurement Engine",
  description: "Maryland contractor roof measurement with transparent geospatial provenance.",
  applicationName: "Roof Measurement Engine",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Roof Engine",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#141921",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
