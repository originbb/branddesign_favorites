import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "즐겨찾기함",
  description: "팀이 함께 보는 즐겨찾기함",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { DialogProvider } from "@/components/DialogProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
      </head>
      <body>
        <ThemeProvider>
          <DialogProvider>
            {children}
          </DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
