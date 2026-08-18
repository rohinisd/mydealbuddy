import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Providers } from "@/context/Providers";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MyDealBuddy",
  description: "Your daily companion for saving big.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
