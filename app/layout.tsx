import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIOS - Strategic Intelligence Operating System",
  description: "AI-native strategic data graph for multi-entity strategy execution."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

