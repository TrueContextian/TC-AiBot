import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueContext AI Assistant",
  description: "AI-powered assistant for TrueContext documentation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
