import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "브랜드전략디자인팀의 즐겨찾기",
  description: "팀이 함께 보는 즐겨찾기 모음",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
