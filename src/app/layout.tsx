// ===============================================================
//  Layout หลัก: ครอบทุกหน้าในเว็บ (ฟอนต์, แถบเมนูล่าง)
// ===============================================================
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const thaiFont = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "MyBad ก๊วนแบด",
  description: "สุ่มคู่ตีแบดมินตัน + นับแต้ม สำหรับก๊วนเพื่อน",
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${thaiFont.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        {/* pb-24 = เว้นที่ด้านล่างไม่ให้เนื้อหาโดนเมนูล่างบัง */}
        <main className="mx-auto max-w-lg px-4 pt-6 pb-24">{children}</main>
        <NavBar />
      </body>
    </html>
  );
}
