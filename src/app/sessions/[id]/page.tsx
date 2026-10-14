// ===============================================================
//  หน้า "/sessions/[id]" : หน้าหลักของวันตีจริง
//  [id] ในชื่อโฟลเดอร์ = ส่วนของ URL ที่เปลี่ยนได้ เช่น /sessions/5 → id = "5"
// ===============================================================
import { notFound } from "next/navigation";
import { deleteSession, updateAttendance } from "@/actions/sessions";
import MatchCard from "@/components/MatchCard";
import PageHeader from "@/components/PageHeader";
import PlayerCheckboxes from "@/components/PlayerCheckboxes";
import ShuffleTeamsButton from "@/components/ShuffleTeamsButton";
import StartMatchForm from "@/components/StartMatchForm";
import StatsTable from "@/components/StatsTable";
import SubmitButton from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatThaiDate, teamName } from "@/lib/format";
import { computeStats } from "@/lib/stats";

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();

  // ดึงนัดนี้ พร้อมคนที่มา คู่หู และทุกเกม ในคำสั่งเดียว
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      attendances: { include: { player: true }, orderBy: { player: { name: "asc" } } },
      teams: { include: { members: { include: { player: true } } }, orderBy: { number: "asc" } },
      matches: {
        include: { players: { include: { player: true } } },
        orderBy: { number: "desc" }, // เกมล่าสุดอยู่บน
      },
    },
  });
  if (!session) notFound();

  const allPlayers = await db.player.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  const attendees = session.attendances.map((a) => a.player);
  const liveMatches = session.matches.filter((m) => m.status !== "FINISHED");
  const finishedMatches = session.matches.filter((m) => m.status === "FINISHED");
  const busyTeamIds = new Set(liveMatches.flatMap((m) => [m.teamAId, m.teamBId]));

  // ข้อมูลคู่หูสำหรับแสดงผล
  const teams = session.teams.map((t) => ({
    id: t.id,
    number: t.number,
    names: teamName(t.members.map((m) => m.player)),
    gamesPlayed: session.matches.filter((m) => m.teamAId === t.id || m.teamBId === t.id).length,
    busy: busyTeamIds.has(t.id),
  }));

  // เช็กว่ารายชื่อคนที่มาเปลี่ยนไปหลังสุ่มคู่หูหรือเปล่า (เช่น มีคนมาสาย)
  const playersInTeams = new Set(session.teams.flatMap((t) => t.members.map((m) => m.playerId)));
  const attendanceChanged =
    session.teams.length > 0 &&
    (attendees.length !== playersInTeams.size || attendees.some((p) => !playersInTeams.has(p.id)));

  const todayStats = computeStats(attendees, finishedMatches);
  const isDoubles = session.matchType === "DOUBLES";

  return (
    <>
      <PageHeader
        title={formatThaiDate(session.date)}
        subtitle={`${isDoubles ? "ตีคู่" : "ตีเดี่ยว"} • ${session.pointsToWin} แต้ม • มา ${attendees.length} คน`}
        backHref="/"
      />

      {/* ---------- คนที่มา (กดเปิด/ปิดได้) ---------- */}
      <details className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium">
          👥 คนที่มา {attendees.length} คน{" "}
          <span className="text-sm font-normal text-slate-500">(แตะเพื่อแก้ไข)</span>
        </summary>
        <form action={updateAttendance} className="mt-4 space-y-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <PlayerCheckboxes players={allPlayers} selectedIds={attendees.map((p) => p.id)} />
          <SubmitButton variant="secondary" className="w-full">
            บันทึกรายชื่อ
          </SubmitButton>
        </form>
      </details>

      {/* ---------- คู่หูวันนี้ ---------- */}
      {isDoubles && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">🤝 คู่หูสัปดาห์นี้</h2>
          {teams.length > 0 && (
            <ul className="mb-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {session.teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 text-sm text-slate-500">คู่ {t.number}</span>
                  <span className="flex-1 font-medium">{teamName(t.members.map((m) => m.player))}</span>
                  {t.members.length === 3 && <span className="text-xs text-slate-500">3 คน ผลัดกันลง</span>}
                </li>
              ))}
            </ul>
          )}
          {attendanceChanged && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
              รายชื่อคนที่มาเปลี่ยนไป กด “สุ่มคู่หูใหม่” เพื่อจัดคู่ให้ครบทุกคน
            </p>
          )}
          <ShuffleTeamsButton sessionId={session.id} hasTeams={teams.length > 0} />
        </section>
      )}
      {/* ตีเดี่ยวไม่มีคู่หู แต่ต้องอัปเดตรายชื่อผู้แข่งเมื่อคนที่มาเปลี่ยน */}
      {!isDoubles && (attendanceChanged || (teams.length === 0 && attendees.length >= 2)) && (
        <div className="mb-8 space-y-3">
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            รายชื่อคนที่มาเปลี่ยนไป กดปุ่มด้านล่างเพื่ออัปเดตรายชื่อผู้แข่ง
          </p>
          <ShuffleTeamsButton sessionId={session.id} hasTeams={teams.length > 0} />
        </div>
      )}

      {/* ---------- เริ่มเกมใหม่ ---------- */}
      {teams.length >= 2 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">🏸 เริ่มเกมใหม่</h2>
          <StartMatchForm sessionId={session.id} teams={teams} />
        </section>
      )}

      {/* ---------- กำลังตี / รอคิว ---------- */}
      {liveMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">⏱️ กำลังตี / รอคิว</h2>
          <div className="space-y-3">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- จบแล้ว ---------- */}
      {finishedMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">✅ จบแล้ว {finishedMatches.length} เกม</h2>
          <div className="space-y-3">
            {finishedMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- สรุปผลวันนี้ ---------- */}
      {todayStats.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">🏆 สรุปผลวันนี้</h2>
          <StatsTable stats={todayStats} />
        </section>
      )}

      {/* ---------- ลบนัด ---------- */}
      <form action={deleteSession} className="border-t border-slate-200 pt-6">
        <input type="hidden" name="sessionId" value={session.id} />
        <SubmitButton
          variant="danger"
          className="w-full"
          confirmMessage="ลบนัดนี้ทั้งหมด? คู่หู เกม และคะแนนทั้งหมดในนัดนี้จะหายไปด้วย"
        >
          🗑️ ลบนัดนี้
        </SubmitButton>
      </form>
    </>
  );
}
