"use client"; // ต้องเป็น Client Component เพราะใช้ usePathname (รู้ว่าอยู่หน้าไหน)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/", label: "นัดตี", icon: "🏸" },
  { href: "/players", label: "ผู้เล่น", icon: "👥" },
  { href: "/stats", label: "อันดับ", icon: "🏆" },
];

/** แถบเมนูด้านล่างจอ แบบแอปมือถือ */
export default function NavBar() {
  // URL ปัจจุบันรู้ได้ตอนมีคนเปิดเว็บเท่านั้น Next.js จึงให้ครอบด้วย <Suspense>
  // ระหว่างรอ แสดงเมนูแบบยังไม่ไฮไลต์ไปก่อน
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <CurrentNavLinks />
    </Suspense>
  );
}

function CurrentNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {LINKS.map((link) => {
          const active = pathname !== null && isActive(link.href, pathname);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                className={`flex flex-col items-center py-2 text-xs ${
                  active ? "font-semibold text-brand" : "text-slate-500"
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** เมนู "นัดตี" ให้ไฮไลต์ในหน้านัดและหน้านับแต้มด้วย */
function isActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/sessions") || pathname.startsWith("/matches");
  }
  return pathname.startsWith(href);
}
