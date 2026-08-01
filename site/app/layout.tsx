import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yukti | Thoughtful gifts, prepared",
  description: "A relationship-aware gifting concierge that remembers what matters, finds current options, and asks before every purchase.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
