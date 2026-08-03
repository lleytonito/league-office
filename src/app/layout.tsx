import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "League Office",
  description: "Private league proposals, voting, and commissioner tools.",
  applicationName: "League Office",
  appleWebApp: {
    capable: true,
    title: "League Office",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
