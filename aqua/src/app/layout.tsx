import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
});

export const viewport: Viewport = {
  themeColor: "#020617",
};

export const metadata: Metadata = {
  // metadataBase + canonical './' → 각 경로가 자기 주소를 표준으로 선언한다.
  // 어종 상세에만 canonical 이 있어 /aqua 목록(7만 자)을 비롯한 나머지
  // 페이지가 "사용자 선언 표준 URL 없음" 상태로 색인에서 밀리고 있었다.
  metadataBase: new URL("https://soritok.com/aqua"),
  alternates: { canonical: "./" },
  title: "Aquado - 모든 물생활 지식을 한곳에", // Updated title
  description: "수족관 어종 도감, 질병 정보, 사육 노하우를 한눈에 볼 수 있는 물생활 필수 앱", // Updated description
  keywords: "물생활, 열대어, 담수어, 해수어, 우파루파, 수족관, 사육정보",
  manifest: "/aqua/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aquado",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansKr.variable} font-sans bg-slate-900 text-slate-100 antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-slate-900/80 border-b border-white/10 shadow-sm">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-3xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Aquado
                </span>
                <span className="text-xs text-slate-400 font-medium tracking-wider hidden sm:inline-block">
                  WATER LIFE WIKI
                </span>
              </Link>
              <Navigation />
            </div>
          </header>
          <main className="flex-1 w-full relative">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
