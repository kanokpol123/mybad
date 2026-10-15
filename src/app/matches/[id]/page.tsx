// ===============================================================
//  หน้า "/matches/[id]" : นับแต้ม 1 เกม
// ===============================================================
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { deleteMatch } from "@/actions/matches";
import PageHeader from "@/components/PageHeader";
import Scoreboard from "@/components/Scoreboard";
import SubmitButton from "@/components/SubmitButton";
import LoadingScreen from "@/components/LoadingScreen";
import { db } from "@/lib/db";

export default function MatchPage({ params }: PageProps<"/matches/[id]">) {
  // ส่วนที่ดึงข้อมูลจาก DB ต้องอยู่ใน <Suspense> ระหว่างรอจะแสดง LoadingScreen
  // (Next.js 16 บังคับ เพื่อให้กดลิงก์แล้วหน้าเปลี่ยนทันที ไม่ค้าง)
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MatchPageContent params={params} />
    </Suspense>
  );
}

async function MatchPageContent({ params }: { params: PageProps<"/matches/[id]">["params"] }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { session: true, players: { include: { player: true } } },
  });
  if (!match) notFound();

  // ใครลงฝั่ง A / ฝั่ง B (ชื่อ + ตัวการ์ตูน)
  const playersOf = (side: "A" | "B") =>
    match.players
      .filter((p) => p.side === side)
      .map((p) => ({ name: p.player.name, avatar: p.player.avatar }));

  // ส่งข้อมูลจาก server ให้ Scoreboard (Client Component) ไปจัดการการกดต่อ
  return (
    <>
      <PageHeader title={`เกมที่ ${match.number}`} backHref={`/sessions/${match.sessionId}`} />

      <Scoreboard
        matchId={match.id}
        pointsToWin={match.session.pointsToWin}
        initial={{ a: match.scoreA, b: match.scoreB, serving: match.servingSide }}
        finished={match.status === "FINISHED"}
        teamA={playersOf("A")}
        teamB={playersOf("B")}
      />

      {/* ลบได้ทุกเกมที่ยังไม่จบ (เช่น เริ่มผิดคู่ หรือเลิกตีกลางคัน) */}
      {match.status !== "FINISHED" && (
        <form action={deleteMatch.bind(null, match.id)} className="mt-8">
          <SubmitButton
            variant="danger"
            className="w-full"
            confirmMessage="ลบเกมนี้? คะแนนที่นับไว้ในเกมนี้จะหายไปด้วย"
          >
            🗑️ ลบเกมนี้
          </SubmitButton>
        </form>
      )}
    </>
  );
}
