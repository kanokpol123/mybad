// ===============================================================
//  หน้า "/stats" : ตารางอันดับรวมทุกนัด
// ===============================================================
import { connection } from "next/server";
import PageHeader from "@/components/PageHeader";
import StatsTable from "@/components/StatsTable";
import { db } from "@/lib/db";
import { computeStats } from "@/lib/stats";

export default async function StatsPage() {
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
