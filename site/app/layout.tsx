import type { Metadata } from "next";
import "./globals.css";
import "./product-responsive.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://yukti.yashns.chatgpt.site"),
  title: "Yukti | Thoughtful gifts, prepared",
  description: "A relationship-aware gifting concierge that remembers what matters, finds current options, and asks before every purchase.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Yukti | Thoughtful gifts, prepared",
    description: "Remember the people. Prepare the right gift. Approve every purchase.",
    type: "website",
    images: [{ url: "/og.png", width: 1732, height: 908, alt: "Yukti gift box and the words Thoughtful gifts, without starting from scratch." }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
