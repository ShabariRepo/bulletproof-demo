import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silver Bullet",
  description: "Bulletproof Tier 1 support dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="min-w-0 flex-1 overflow-x-hidden">
            <TopBar title="Silver Bullet" />
            <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-5 lg:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
