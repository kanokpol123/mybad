// ===============================================================
//  หน้าแรก "/" : รายการนัดตีทั้งหมด
// ===============================================================
import Link from "next/link";
import { connection } from "next/server";
import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatThaiDate } from "@/lib/format";

export default async function HomePage() {
  // บอก Next.js ว่าหน้านี้ต้องดึงข้อมูลสดจาก DB ทุกครั้งที่มีคนเปิด (ไม่ใช่สร้างไว้ล่วงหน้าตอน build)
  await connection();

  const sessions = await db.session.findMany({
    orderBy: { date: "desc" },
    include: {
      // _count = นับจำนวนให้เลย ไม่ต้องดึงข้อมูลทั้งหมดมานับเอง
      _count: { select: { attendances: true, matches: true } },
    },
  });

  return (
    <>
      <PageHeader title="🏸 ก๊วนแบด" subtitle="สุ่มคู่ นับแต้ม ไม่ต้องจำเองอีกต่อไป" />

      <Link
        href="/sessions/new"
        className="mb-6 block rounded-2xl bg-brand py-4 text-center text-lg font-semibold text-white shadow-sm"
      >
        + สร้างนัดตีใหม่
      </Link>

      <h2 className="mb-3 font-semibold text-slate-700">นัดที่ผ่านมา</h2>
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          ยังไม่มีนัดเลย
          <br />
          เริ่มจากไปเพิ่มรายชื่อเพื่อนที่เมนู{" "}
          <Link href="/players" className="text-brand underline">
            ผู้เล่น
          </Link>{" "}
          ก่อนนะ
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{formatThaiDate(s.date)}</p>
                  <p className="text-sm text-slate-500">
                    {s._count.attendances} คน • {s._count.matches} เกม •{" "}
                    {s.matchType === "DOUBLES" ? "คู่" : "เดี่ยว"}
                  </p>
                </div>
                <span className="text-slate-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
