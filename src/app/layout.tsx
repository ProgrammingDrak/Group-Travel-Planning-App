import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: "TripSync - Collaborative Trip Planning",
  description:
    "Plan trips together with your group. Vote on activities, manage budgets, and coordinate schedules in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
