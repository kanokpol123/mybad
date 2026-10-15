// ===============================================================
//  หน้า "/sessions/[id]" : หน้าหลักของวันตีจริง
//  [id] ในชื่อโฟลเดอร์ = ส่วนของ URL ที่เปลี่ยนได้ เช่น /sessions/5 → id = "5"
// ===============================================================
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { deleteSession, toggleTeamLock, updateAttendance, updateSessionInfo } from "@/actions/sessions";
import { AvatarGroup } from "@/components/Avatar";
import BookingFields from "@/components/BookingFields";
import LockPairForm from "@/components/LockPairForm";
import MatchCard from "@/components/MatchCard";
import NextMatchButton from "@/components/NextMatchButton";
import PageHeader from "@/components/PageHeader";
import PlayerCheckboxes from "@/components/PlayerCheckboxes";
import ShuffleTeamsButton from "@/components/ShuffleTeamsButton";
import StartMatchForm from "@/components/StartMatchForm";
import StatsTable from "@/components/StatsTable";
import SubmitButton from "@/components/SubmitButton";
import LoadingScreen from "@/components/LoadingScreen";
import { db } from "@/lib/db";
import { formatBooking, formatThaiDate, teamName, toDateInputValue } from "@/lib/format";
import { suggestFillers } from "@/lib/filler";
import { computeQueue, MAX_WIN_STREAK, type TeamQueueStatus } from "@/lib/queue";
import { computeStats } from "@/lib/stats";

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  // ส่วนที่ดึงข้อมูลจาก DB ต้องอยู่ใน <Suspense> ระหว่างรอจะแสดง LoadingScreen
  // (Next.js 16 บังคับ เพื่อให้กดลิงก์แล้วหน้าเปลี่ยนทันที ไม่ค้าง)
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SessionPageContent params={params} />
    </Suspense>
  );
}

async function SessionPageContent({ params }: { params: PageProps<"/sessions/[id]">["params"] }) {
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
  const isDoubles = session.matchType === "DOUBLES";
  const liveMatches = session.matches.filter((m) => m.status !== "FINISHED");
  const finishedMatches = session.matches.filter((m) => m.status === "FINISHED");

  // คำนวณคิวลงสนาม (ชนะอยู่ต่อ สูงสุด 2 เกม) จากประวัติเกม
  const queue = computeQueue(
    session.teams.map((t) => t.id),
    session.matches,
  );

  // ข้อมูลคู่หูสำหรับแสดงผล
  const teams = session.teams.map((t) => ({
    id: t.id,
    number: t.number,
    names: teamName(t.members.map((m) => m.player)),
    queueStatus: queue.status.get(t.id) ?? ({ kind: "playing" } as TeamQueueStatus),
    streak: queue.streak.get(t.id) ?? 0,
    busy: queue.status.get(t.id)?.kind === "playing",
  }));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  // เรียงคิวให้ดูง่าย: แชมป์ที่รออยู่ → คิวที่ 1, 2, 3 → คู่ที่กำลังตี
  const queueOrder = { champion: 0, queued: 1, playing: 2 };
  const queueList = [...teams].sort(
    (a, b) =>
      queueOrder[a.queueStatus.kind] - queueOrder[b.queueStatus.kind] ||
      (a.queueStatus.kind === "queued" && b.queueStatus.kind === "queued"
        ? a.queueStatus.position - b.queueStatus.position
        : 0),
  );
  const nextLabel = queue.next
    ? queue.next.map((id) => `คู่ ${teamById.get(id)!.number}`).join(" vs ")
    : null;

  // ถ้าเกมถัดไปมี "คนที่เป็นเศษ" (ตีคู่แต่มีคนเดียว) → เตรียมรายชื่อตัวเติมให้เลือก
  const playerName = new Map(attendees.map((p) => [p.id, p.name]));
  const soloTeamId = isDoubles
    ? queue.next?.find((id) => session.teams.find((t) => t.id === id)?.members.length === 1)
    : undefined;
  const filler =
    queue.next && soloTeamId !== undefined
      ? {
          soloName: teamById.get(soloTeamId)!.names,
          options: suggestFillers({
            soloTeamId,
            opponentTeamId: queue.next.find((id) => id !== soloTeamId)!,
            teams: session.teams.map((t) => ({ id: t.id, memberIds: t.members.map((m) => m.playerId) })),
            queueStatus: queue.status,
            matches: session.matches,
          }).map((c) => ({ id: c.playerId, name: playerName.get(c.playerId) ?? "?", gamesPlayed: c.gamesPlayed })),
        }
      : null;

  // เช็กว่ารายชื่อคนที่มาเปลี่ยนไปหลังสุ่มคู่หูหรือเปล่า (เช่น มีคนมาสาย)
  const playersInTeams = new Set(session.teams.flatMap((t) => t.members.map((m) => m.playerId)));
  const attendanceChanged =
    session.teams.length > 0 &&
    (attendees.length !== playersInTeams.size || attendees.some((p) => !playersInTeams.has(p.id)));

  const todayStats = computeStats(attendees, finishedMatches);

  return (
    <>
      <PageHeader
        title={formatThaiDate(session.date)}
        subtitle={`${isDoubles ? "ตีคู่" : "ตีเดี่ยว"} • ${session.pointsToWin} แต้ม • มา ${attendees.length} คน`}
        backHref="/"
      />

      {/* ---------- เวลาที่จอง + คอร์ท ---------- */}
      {formatBooking(session) && (
        <p className="-mt-4 mb-6 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          🕒 {formatBooking(session)}
        </p>
      )}

      <details className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium">✏️ แก้ไขวัน เวลา คอร์ท</summary>
        <form action={updateSessionInfo} className="mt-4 space-y-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">วันที่</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={toDateInputValue(session.date)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            />
          </label>
          <BookingFields defaults={session} />
          <SubmitButton variant="secondary" className="w-full">
            บันทึก
          </SubmitButton>
        </form>
      </details>

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
          <h2 className="mb-1 font-semibold text-slate-700">🤝 คู่หูสัปดาห์นี้</h2>
          <p className="mb-3 text-sm text-slate-500">กด 🔓 เพื่อล็อกคู่ — คู่ที่ล็อก 🔒 จะไม่ถูกสุ่มใหม่</p>
          {teams.length > 0 && (
            <ul className="mb-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {session.teams.map((t) => (
                <li key={t.id} className={`flex items-center gap-3 px-4 py-2 ${t.locked ? "bg-amber-50" : ""}`}>
                  <span className="w-12 shrink-0 text-sm text-slate-500">คู่ {t.number}</span>
                  <AvatarGroup players={t.members.map((m) => m.player)} />
                  <span className="min-w-0 flex-1 truncate font-medium">{teamName(t.members.map((m) => m.player))}</span>
                  {t.members.length === 1 && <span className="text-xs text-amber-700">ลงพร้อมตัวเติม</span>}
                  {t.members.length === 3 && <span className="text-xs text-slate-500">3 คน ผลัดกันลง</span>}
                  {t.members.length === 2 && (
                    <form action={toggleTeamLock}>
                      <input type="hidden" name="teamId" value={t.id} />
                      <button
                        type="submit"
                        aria-label={t.locked ? "ปลดล็อกคู่นี้" : "ล็อกคู่นี้"}
                        className="rounded-lg px-2 py-1 text-lg hover:bg-slate-100"
                      >
                        {t.locked ? "🔒" : "🔓"}
                      </button>
                    </form>
                  )}
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

          {attendees.length >= 2 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-slate-500">จับคู่เอง (เลือก 2 คนให้เป็นคู่กัน)</summary>
              <div className="mt-3">
                <LockPairForm sessionId={session.id} players={attendees} />
              </div>
            </details>
          )}
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

      {/* ---------- คิวลงสนาม ---------- */}
      {teams.length >= 2 && (
        <section className="mb-8">
          <h2 className="mb-1 font-semibold text-slate-700">🏸 คิวลงสนาม</h2>
          <p className="mb-3 text-sm text-slate-500">
            ชนะอยู่ต่อ • แพ้ไปต่อท้ายคิว • ชนะ {MAX_WIN_STREAK} ติดต้องออก
          </p>

          <NextMatchButton sessionId={session.id} label={nextLabel} filler={filler} />

          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {queueList.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-12 shrink-0 text-sm text-slate-500">คู่ {t.number}</span>
                <span className="flex-1 truncate">{t.names}</span>
                <QueueBadge status={t.queueStatus} streak={t.streak} />
              </li>
            ))}
          </ul>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-slate-500">เลือกคู่ลงเอง (ข้ามคิว)</summary>
            <div className="mt-3">
              <StartMatchForm sessionId={session.id} teams={teams} />
            </div>
          </details>
        </section>
      )}

      {/* ---------- กำลังตี ---------- */}
      {liveMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-slate-700">⏱️ กำลังตี</h2>
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

/** ป้ายสถานะในคิว: แชมป์รอคู่ใหม่ / คิวที่ N / กำลังตี */
function QueueBadge({ status, streak }: { status: TeamQueueStatus; streak: number }) {
  if (status.kind === "champion") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        🔥 ชนะ {status.streak} • รอคู่ต่อไป
      </span>
    );
  }
  if (status.kind === "queued") {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">คิวที่ {status.position}</span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700">
      กำลังตี{streak > 0 ? ` • 🔥 ชนะ ${streak}` : ""}
    </span>
  );
}
