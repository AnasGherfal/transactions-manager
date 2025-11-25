// app/layout.tsx
import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";

// const inter = Inter({ subsets: ["latin"] });
import { ThemeProvider } from "@/components/theme-provider"


export const metadata: Metadata = {
  title: "Transactions Manager",
  description: "Manage your company orders and transactions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body >
{/* 
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          > */}
            {children}
          {/* </ThemeProvider> */}
           </body>
    </html>
  );
}