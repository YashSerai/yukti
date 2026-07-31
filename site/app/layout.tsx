import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yukti | Life admin, prepared",
  description: "A consent-first calendar agent that prepares life admin and purchases for your approval.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
