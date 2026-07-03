import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://branddesign-favorites.vercel.app"),
  title: "즐겨찾기함",
  description: "팀이 함께 보는 즐겨찾기함",
  // og:image / twitter:image 는 app/opengraph-image.jpg · app/twitter-image.jpg
  // 파일 규약으로 Next.js가 자동 주입한다(절대 URL은 metadataBase 기준).
  openGraph: {
    title: "즐겨찾기함",
    description: "팀이 함께 보는 즐겨찾기함",
    siteName: "브랜드전략디자인팀 즐겨찾기",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "즐겨찾기함",
    description: "팀이 함께 보는 즐겨찾기함",
  },
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
