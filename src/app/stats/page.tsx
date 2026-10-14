// ===============================================================
//  หน้า "/stats" : ตารางอันดับรวมทุกนัด
// ===============================================================
import { Suspense } from "react";
import { connection } from "next/server";
import PageHeader from "@/components/PageHeader";
import StatsTable from "@/components/StatsTable";
import LoadingScreen from "@/components/LoadingScreen";
import { db } from "@/lib/db";
import { computeStats } from "@/lib/stats";

export default function StatsPage() {
  // ส่วนที่ดึงข้อมูลจาก DB ต้องอยู่ใน <Suspense> ระหว่างรอจะแสดง LoadingScreen
  // (Next.js 16 บังคับ เพื่อให้กดลิงก์แล้วหน้าเปลี่ยนทันที ไม่ค้าง)
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StatsPageContent />
    </Suspense>
  );
}

async function StatsPageContent() {
  await connection();

  // ดึงข้อมูล 2 อย่างพร้อมกัน (เร็วกว่ารอทีละอัน)
  const [players, matches] = await Promise.all([
    db.player.findMany(),
    db.match.findMany({ where: { status: "FINISHED" }, include: { players: true } }),
  ]);

  const stats = computeStats(players, matches);

  return (
    <>
      <PageHeader title="🏆 ตารางอันดับ" subtitle={`จากทั้งหมด ${matches.length} เกมที่จบแล้ว`} />
      <StatsTable stats={stats} />
      <p className="mt-3 text-xs text-slate-400">+/- = แต้มที่ได้ ลบ แต้มที่เสีย รวมทุกเกม</p>
    </>
  );
}
