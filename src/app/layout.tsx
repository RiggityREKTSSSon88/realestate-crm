import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EstateIQ CRM",
  description: "Real estate CRM for Australian agencies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
