import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiKeyProvider } from "./component/ApiKeyProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "mongoDB rag",
  description: "RAG using MongoDB Atlas & OpenAI",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/bot.png", sizes: "192x192", type: "image/png" },
      { url: "/bot.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/bot.png" },
    ],
  },
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
        <ApiKeyProvider>
          {children}
          <ToastContainer />
        </ApiKeyProvider>
      </body>
    </html>
  );
}
