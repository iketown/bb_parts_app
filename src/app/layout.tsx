import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Band Parts Tracker",
  description: "Track vocal and instrumental parts for band members",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-bold">
                Band Parts Tracker
              </Link>
              <div className="flex gap-4">
                <Link href="/songs" className="hover:underline">
                  Songs
                </Link>
                <Link href="/members" className="hover:underline">
                  Members
                </Link>
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
