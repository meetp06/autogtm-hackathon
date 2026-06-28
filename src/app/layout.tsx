import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ChromeBackground } from "@/components/ChromeBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forge — Launch while the market is still talking",
  description: "Forge finds live buyer pain, locks the angle, and stages campaign assets for your approval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <ChromeBackground />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
