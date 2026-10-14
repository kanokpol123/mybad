// ===============================================================
//  Server Actions: นัดตี, สุ่มคู่หู, เริ่มเกม
// ===============================================================
"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getIdList, getInt, getString } from "@/lib/form-data";
import { makeTeams, shuffle, type PastTeam } from "@/lib/pairing";
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
  if (await hasLiveMatches(sessionId)) return { error: LIVE_MATCH_ERROR };

  const attendees = await db.attendance.count({ where: { sessionId } });
  if (attendees < 2) return { error: "ต้องมีคนมาอย่างน้อย 2 คน" };

  await createTeams(sessionId);
  refresh();
  return {};
}

/** จับคู่เอง: เลือก 2 คนให้เป็นคู่กัน (ล็อกไว้) แล้วสุ่มคนที่เหลือใหม่ */
export async function lockPair(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const sessionId = getInt(formData, "sessionId", 1, MAX_ID);
  const playerA = getInt(formData, "playerA", 1, MAX_ID);
  const playerB = getInt(formData, "playerB", 1, MAX_ID);
  if (playerA === playerB) return { error: "เลือก 2 คนที่ไม่ซ้ำกัน" };
  if (await hasLiveMatches(sessionId)) return { error: LIVE_MATCH_ERROR };

  const bothAttending = await db.attendance.count({
    where: { sessionId, playerId: { in: [playerA, playerB] } },
  });
  if (bothAttending !== 2) return { error: "ต้องเลือกคนที่มาวันนี้" };

  await createTeams(sessionId, [playerA, playerB]);
  refresh();
  return {};
}

/** กดล็อก / ปลดล็อกคู่ (ไม่สุ่มใหม่ แค่เปลี่ยนสถานะ) */
export async function toggleTeamLock(formData: FormData) {
  const teamId = getInt(formData, "teamId", 1, MAX_ID);
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  await db.team.update({ where: { id: teamId }, data: { locked: !team.locked } });
  refresh();
}

const LIVE_MATCH_ERROR = "ยังมีเกมที่ยังไม่จบ ให้จบหรือลบเกมนั้นก่อน";

async function hasLiveMatches(sessionId: number) {
  const count = await db.match.count({ where: { sessionId, status: { not: "FINISHED" } } });
  return count > 0;
}

/**
 * หัวใจของระบบ: ดึงข้อมูลจาก DB → ส่งให้ makeTeams() คิด → บันทึกผลลง DB
 * คู่ที่ล็อกไว้จะไม่ถูกสุ่ม (newLockedPair = คู่ที่เพิ่งจับเอง ให้ล็อกเพิ่ม)
 */
async function createTeams(sessionId: number, newLockedPair: [number, number] | null = null) {
  const session = await db.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      attendances: { include: { player: true } },
      teams: { include: { members: true } }, // คู่หูชุดปัจจุบัน (ถ้ากดสุ่มใหม่)
    },
  });
  const players = session.attendances.map((a) => a.player);
  if (players.length < 2) return;
  const attending = new Set(players.map((p) => p.id));

  // 0) คู่ที่ล็อกไว้ (ตีคู่เท่านั้น) ข้ามคู่ที่มีคนไม่ได้มาแล้ว และคนที่กำลังจับคู่ใหม่
  const isDoubles = session.matchType === "DOUBLES";
  let lockedGroups = isDoubles
    ? session.teams
        .filter((t) => t.locked)
        .map((t) => t.members.map((m) => m.playerId))
        .filter((ids) => ids.every((id) => attending.has(id)))
    : [];
  if (newLockedPair && isDoubles) {
    lockedGroups = lockedGroups.filter((ids) => !ids.some((id) => newLockedPair.includes(id)));
    lockedGroups.push(newLockedPair.filter((id) => attending.has(id)));
  }
  const lockedIds = new Set(lockedGroups.flat());
  const freePlayers = players.filter((p) => !lockedIds.has(p.id));

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

  // 2) ให้อัลกอริทึมสุ่มเฉพาะคนที่ไม่ได้ล็อก
  const teamSize = isDoubles ? 2 : 1;
  const randomTeams = freePlayers.length > 0 ? makeTeams(freePlayers, teamSize, history) : [];

  // รวมคู่ที่ล็อก + คู่ที่สุ่มได้ แล้วสลับลำดับ (เลขคู่ = ลำดับคิวตอนเริ่ม จะได้ไม่มีใครได้เปรียบ)
  const allTeams = shuffle([
    ...lockedGroups.filter((ids) => ids.length > 0).map((ids) => ({ ids, locked: true })),
    ...randomTeams.map((members) => ({ ids: members.map((p) => p.id), locked: false })),
  ]);

  // 3) ลบคู่หูเก่า (ถ้ามี) แล้วบันทึกคู่หูใหม่
  await db.$transaction([
    db.team.deleteMany({ where: { sessionId } }),
    ...allTeams.map((team, index) =>
      db.team.create({
        data: {
          sessionId,
          number: index + 1,
          locked: team.locked,
          members: { create: team.ids.map((playerId) => ({ playerId })) },
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
