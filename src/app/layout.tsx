import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://branddesign-favorites.vercel.app"),
  title: "즐겨찾기함",
  description: "필요한 링크 모음 배포, 나만의 방식으로 구성",
  // iOS "홈 화면에 추가" 시 기본 이름 (apple-mobile-web-app-title)
  appleWebApp: { title: "즐겨찾기함" },
  // og:image / twitter:image 는 app/opengraph-image.jpg · app/twitter-image.jpg
  // 파일 규약으로 Next.js가 자동 주입한다(절대 URL은 metadataBase 기준).
  openGraph: {
    title: "즐겨찾기함",
    description: "필요한 링크 모음 배포, 나만의 방식으로 구성",
    siteName: "브랜드전략디자인팀 즐겨찾기",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "즐겨찾기함",
    description: "필요한 링크 모음 배포, 나만의 방식으로 구성",
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
        <link rel="preload" href="/fonts/black-han-sans-korean-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/black-han-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://unavatar.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://t3.gstatic.com" crossOrigin="anonymous" />
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
