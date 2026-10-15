// ===============================================================
//  หน้า "/players" : เพิ่ม/แก้ไขรายชื่อผู้เล่น
// ===============================================================
import { Suspense } from "react";
import { connection } from "next/server";
import AddPlayerForm from "@/components/AddPlayerForm";
import PageHeader from "@/components/PageHeader";
import PlayerRow from "@/components/PlayerRow";
import LoadingScreen from "@/components/LoadingScreen";
import { db } from "@/lib/db";

export default function PlayersPage() {
  // ส่วนที่ดึงข้อมูลจาก DB ต้องอยู่ใน <Suspense> ระหว่างรอจะแสดง LoadingScreen
  // (Next.js 16 บังคับ เพื่อให้กดลิงก์แล้วหน้าเปลี่ยนทันที ไม่ค้าง)
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlayersPageContent />
    </Suspense>
  );
}

async function PlayersPageContent() {
  await connection();

  const players = await db.player.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const activeCount = players.filter((p) => p.active).length;

  return (
    <>
      <PageHeader title="👥 ผู้เล่น" subtitle={`ทั้งหมด ${activeCount} คน • กด ✏️ เพื่อแก้ชื่อหรือเลือกตัวการ์ตูน`} />

      <AddPlayerForm />

      <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {players.map((p) => (
          <PlayerRow key={p.id} player={p} />
        ))}
        {players.length === 0 && <li className="p-6 text-center text-slate-500">ยังไม่มีผู้เล่น เพิ่มคนแรกเลย!</li>}
      </ul>
    </>
  );
}
