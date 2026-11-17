import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vitalis — Virtual Clinic & Telemedicine",
    template: "%s · Vitalis Virtual Clinic",
  },
  description:
    "Book an online slot, get triaged by an AI Pre-Checkup Nurse, and meet your doctor in a virtual consultation room — no clinic visit required.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable}`}
    >
      <body>
        <TopNav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
