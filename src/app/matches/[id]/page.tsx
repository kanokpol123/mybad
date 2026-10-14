// ===============================================================
//  หน้า "/matches/[id]" : นับแต้ม 1 เกม
// ===============================================================
import { notFound } from "next/navigation";
import { deleteMatch } from "@/actions/matches";
import PageHeader from "@/components/PageHeader";
import Scoreboard from "@/components/Scoreboard";
import SubmitButton from "@/components/SubmitButton";
import { db } from "@/lib/db";

export default async function MatchPage({ params }: PageProps<"/matches/[id]">) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { session: true, players: { include: { player: true } } },
  });
  if (!match) notFound();

  const namesOf = (side: "A" | "B") =>
    match.players.filter((p) => p.side === side).map((p) => p.player.name);

  // ส่งข้อมูลจาก server ให้ Scoreboard (Client Component) ไปจัดการการกดต่อ
  return (
    <>
      <PageHeader title={`เกมที่ ${match.number}`} backHref={`/sessions/${match.sessionId}`} />

      <Scoreboard
        matchId={match.id}
        pointsToWin={match.session.pointsToWin}
        initial={{ a: match.scoreA, b: match.scoreB, serving: match.servingSide }}
        finished={match.status === "FINISHED"}
        teamANames={namesOf("A")}
        teamBNames={namesOf("B")}
      />

      {/* ลบได้เฉพาะเกมที่ยังไม่เริ่ม (กันลบเกมที่มีคะแนนแล้วโดยไม่ตั้งใจ) */}
      {match.status === "WAITING" && (
        <form action={deleteMatch.bind(null, match.id)} className="mt-8">
          <SubmitButton variant="danger" className="w-full" confirmMessage="ลบเกมนี้? (เช่น ไม่ได้ตีจริง)">
            🗑️ ลบเกมนี้
          </SubmitButton>
        </form>
      )}
    </>
  );
}
