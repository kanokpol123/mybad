// ===============================================================
//  Server Actions: นัดตี, สุ่มคู่หู, เริ่มเกม
// ===============================================================
"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getIdList, getInt, getString } from "@/lib/form-data";
import { makeTeams, type PastTeam } from "@/lib/pairing";
import { suggestFillers } from "@/lib/filler";
import { computeQueue } from "@/lib/queue";

const MAX_ID = Number.MAX_SAFE_INTEGER;
const HISTORY_WEEKS = 6; // ดูย้อนหลังกี่นัด เพื่อไม่ให้ได้คู่หูซ้ำ

export type ActionResult = { error?: string };

// ---------------------------------------------------------------
//  นัดตี
// ---------------------------------------------------------------

/** สร้างนัดใหม่ + สุ่มคู่หูให้เลย แล้วพาไปหน้านัดนั้น */
export async function createSession(formData: FormData) {
  const dateText = getString(formData, "date"); // "2026-10-18"
  const pointsToWin = getInt(formData, "pointsToWin", 5, 30);
  const matchType = getString(formData, "matchType") === "SINGLES" ? "SINGLES" : "DOUBLES";
  const playerIds = getIdList(formData, "playerIds");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error("วันที่ไม่ถูกต้อง");

  const session = await db.session.create({
    data: {
      date: new Date(dateText), // "YYYY-MM-DD" จะถูกอ่านเป็นเที่ยงคืน UTC ของวันนั้น
      pointsToWin,
      matchType,
      // สร้างรายชื่อคนที่มาไปพร้อมกันเลย
      attendances: { create: playerIds.map((playerId) => ({ playerId })) },
    },
  });

  await createTeams(session.id);
  redirect(`/sessions/${session.id}`);
}

/** แก้รายชื่อคนที่มา (เช่น มีคนมาสาย หรือกลับก่อน) */
export async function updateAttendance(formData: FormData) {
  const sessionId = getInt(formData, "sessionId", 1, MAX_ID);
  const playerIds = getIdList(formData, "playerIds");

  // $transaction = ทำทั้งสองคำสั่งให้สำเร็จพร้อมกัน ถ้าพังก็ยกเลิกทั้งคู่
  await db.$transaction([
    db.attendance.deleteMany({ where: { sessionId } }),
    db.attendance.createMany({ data: playerIds.map((playerId) => ({ sessionId, playerId })) }),
  ]);
  refresh();
}

/** ลบนัดทั้งนัด (คู่หู เกม และคะแนนในนัดนี้จะหายด้วย) */
export async function deleteSession(formData: FormData) {
  const sessionId = getInt(formData, "sessionId", 1, MAX_ID);
  await db.session.delete({ where: { id: sessionId } });
  redirect("/");
}

// ---------------------------------------------------------------
//  คู่หูประจำสัปดาห์
// ---------------------------------------------------------------

/** สุ่มคู่หูใหม่ (เกมที่ตีจบไปแล้วยังอยู่ครบ) */
export async function shuffleTeams(sessionId: number): Promise<ActionResult> {
  const liveMatches = await db.match.count({
    where: { sessionId, status: { not: "FINISHED" } },
  });
  if (liveMatches > 0) {
    return { error: "ยังมีเกมที่ยังไม่จบ ให้จบหรือลบเกมนั้นก่อน" };
  }

  const attendees = await db.attendance.count({ where: { sessionId } });
  if (attendees < 2) return { error: "ต้องมีคนมาอย่างน้อย 2 คน" };

  await createTeams(sessionId);
  refresh();
  return {};
}

/** หัวใจของระบบ: ดึงข้อมูลจาก DB → ส่งให้ makeTeams() คิด → บันทึกผลลง DB */
async function createTeams(sessionId: number) {
  const session = await db.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      attendances: { include: { player: true } },
      teams: { include: { members: true } }, // คู่หูชุดปัจจุบัน (ถ้ากดสุ่มใหม่)
    },
  });
  const players = session.attendances.map((a) => a.player);
  if (players.length < 2) return;

  // 1) ประวัติคู่หูของสัปดาห์ก่อนๆ (สัปดาห์ล่าสุดสำคัญที่สุด) ดูเฉพาะนัดที่ตีคู่
  const previousSessions = await db.session.findMany({
    where: { date: { lte: session.date }, id: { not: sessionId }, matchType: "DOUBLES" },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: HISTORY_WEEKS,
    include: { teams: { include: { members: true } } },
  });
  const history: PastTeam[] = [
    // คู่หูชุดที่กำลังจะถูกแทนที่ สำคัญที่สุด ไม่งั้นกด "สุ่มใหม่" แล้วอาจได้คู่เดิม
    ...session.teams.map((team) => ({
      memberIds: team.members.map((m) => m.playerId),
      weight: HISTORY_WEEKS + 1,
    })),
    ...previousSessions.flatMap((s, index) =>
      s.teams.map((team) => ({
        memberIds: team.members.map((m) => m.playerId),
        weight: HISTORY_WEEKS - index, // ล่าสุด = 6, ถัดไป = 5, ...
      })),
    ),
  ];

  // 2) ให้อัลกอริทึมคิด
  const teamSize = session.matchType === "SINGLES" ? 1 : 2;
  const teams = makeTeams(players, teamSize, history);

  // 3) ลบคู่หูเก่า (ถ้ามี) แล้วบันทึกคู่หูใหม่
  await db.$transaction([
    db.team.deleteMany({ where: { sessionId } }),
    ...teams.map((members, index) =>
      db.team.create({
        data: {
          sessionId,
          number: index + 1,
          members: { create: members.map((p) => ({ playerId: p.id })) },
        },
      }),
    ),
  ]);
}

// ---------------------------------------------------------------
//  เริ่มเกม
// ---------------------------------------------------------------

/** เริ่มเกมจาก 2 คู่ที่เลือกเอง (ใช้คู่กับ useActionState) */
export async function startMatch(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const sessionId = getInt(formData, "sessionId", 1, MAX_ID);
  const teamIds = getIdList(formData, "teamIds");
  if (teamIds.length !== 2) return { error: "เลือก 2 คู่ที่จะลงแข่ง" };

  const state = await getSessionState(sessionId);
  const isFree = (id: number) => state.queue.status.get(id)?.kind !== "playing";
  const [teamA, teamB] = teamIds.map((id) => state.teams.find((t) => t.id === id && isFree(id)));
  if (!teamA || !teamB) return { error: "มีคู่ที่กำลังตีอยู่" };

  return createMatch(state, teamA, teamB, null); // ถ้าต้องมีตัวเติม ใช้คนที่ระบบเสนอ
}

/** เริ่มเกมถัดไปตามคิว (ชนะอยู่ต่อ สูงสุด 2 เกม — ดูกติกาใน lib/queue.ts) */
export async function startNextMatch(sessionId: number, fillerId: number | null): Promise<ActionResult> {
  const state = await getSessionState(sessionId);
  if (!state.queue.next) return { error: "คู่ที่ว่างไม่ถึง 2 คู่ (คู่อื่นกำลังตีอยู่)" };

  const [teamA, teamB] = state.queue.next.map((id) => state.teams.find((t) => t.id === id)!);
  return createMatch(state, teamA, teamB, fillerId);
}

type SessionState = Awaited<ReturnType<typeof getSessionState>>;
type TeamInfo = SessionState["teams"][number];

/** สร้างเกมใหม่ แล้วพาไปหน้านับแต้มทันที */
async function createMatch(
  state: SessionState,
  teamA: TeamInfo,
  teamB: TeamInfo,
  fillerId: number | null,
): Promise<ActionResult> {
  const playersA = playersOnCourt(state, teamA, teamB, fillerId);
  const playersB = playersOnCourt(state, teamB, teamA, fillerId);
  if ("error" in playersA) return playersA;
  if ("error" in playersB) return playersB;

  const count = await db.match.count({ where: { sessionId: state.sessionId } });
  const match = await db.match.create({
    data: {
      sessionId: state.sessionId,
      number: count + 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      // จดไว้ว่าใครลงฝั่งไหนจริงๆ (รวมตัวเติม) ใช้คิดสถิติรายคน
      players: {
        create: [
          ...playersA.ids.map((playerId) => ({ playerId, side: "A" as const })),
          ...playersB.ids.map((playerId) => ({ playerId, side: "B" as const })),
        ],
      },
    },
  });

  redirect(`/matches/${match.id}`);
}

/** ใครลงสนามในนามคู่นี้: คู่ปกติ = สมาชิกทั้งคู่, คนที่เป็นเศษ = ตัวเขา + ตัวเติม */
function playersOnCourt(
  state: SessionState,
  team: TeamInfo,
  opponent: TeamInfo,
  fillerId: number | null,
): { ids: number[] } | { error: string } {
  const isSolo = state.isDoubles && team.memberIds.length === 1;
  if (!isSolo) return { ids: team.memberIds };

  const candidates = suggestFillers({
    soloTeamId: team.id,
    opponentTeamId: opponent.id,
    teams: state.teams,
    queueStatus: state.queue.status,
    matches: state.matches,
  });
  const chosen = fillerId ?? candidates[0]?.playerId;
  if (chosen === undefined) return { error: "ไม่มีคนว่างมาเป็นตัวเติม" };
  if (!candidates.some((c) => c.playerId === chosen)) return { error: "คนที่เลือกมาเติมไม่ว่างแล้ว" };

  return { ids: [...team.memberIds, chosen] };
}

/** โหลดข้อมูลนัดนี้ (คู่หู + เกมทั้งหมด) แล้วคำนวณคิว */
async function getSessionState(sessionId: number) {
  const [session, teams, matches] = await Promise.all([
    db.session.findUniqueOrThrow({ where: { id: sessionId } }),
    db.team.findMany({ where: { sessionId }, include: { members: true }, orderBy: { number: "asc" } }),
    db.match.findMany({ where: { sessionId }, include: { players: true } }),
  ]);
  return {
    sessionId,
    isDoubles: session.matchType === "DOUBLES",
    teams: teams.map((t) => ({ id: t.id, memberIds: t.members.map((m) => m.playerId) })),
    matches,
    queue: computeQueue(
      teams.map((t) => t.id),
      matches,
    ),
  };
}
