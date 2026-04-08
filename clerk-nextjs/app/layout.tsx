import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";

import StoreProvider from "@wave/app/StoreProvider";
import Banner from "@wave/components/Banner";
import Footer from "@wave/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GoCart. - Shop smarter",
  description: "GoCart. - Shop smarter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${outfit.className} antialiased bg-white text-slate-900`}>
          <StoreProvider>
            <Toaster />
            <Banner />
            <Navbar />
            {children}
            <Footer />
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
