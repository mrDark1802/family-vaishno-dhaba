import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "../components/layout/admin-shell";

export const metadata: Metadata = {
  title: "Operations Portal | Family Vaishno Dhaba",
  description:
    "Kitchen and order operations management console for Family Vaishno Dhaba.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
