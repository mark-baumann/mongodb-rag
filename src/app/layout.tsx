import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiKeyProvider } from "./component/ApiKeyProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "mongoDB rag",
  description: "RAG using MongoDB Atlas & OpenAI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApiKeyProvider>{children}</ApiKeyProvider>
      </body>
    </html>
  );
}
