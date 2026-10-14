// ===============================================================
//  Server Actions: นัดตี, สุ่มคู่หู, เริ่มเกม
// ===============================================================
"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getIdList, getInt, getString } from "@/lib/form-data";
import { makeTeams, pairKey, pickOpponents, type PastTeam } from "@/lib/pairing";

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
    return { error: "ยังมีเกมที่ตีอยู่หรือรอคิว ให้จบหรือลบเกมนั้นก่อน" };
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

  // 1) ประวัติคู่หูของสัปดาห์ก่อนๆ (สัปดาห์ล่าสุดสำคัญที่สุด)
  const previousSessions = await db.session.findMany({
    where: { date: { lte: session.date }, id: { not: sessionId } },
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

  const { freeTeams } = await getTeamStatus(sessionId);
  const [teamA, teamB] = teamIds.map((id) => freeTeams.find((t) => t.id === id));
  if (!teamA || !teamB) return { error: "มีคู่ที่กำลังตีอยู่หรือรอคิวอยู่แล้ว" };

  return createMatch(sessionId, teamA, teamB);
}

/** ให้ระบบเลือกคู่แข่งให้ (คู่ที่ตีน้อยสุดและยังไม่ค่อยเจอกัน) */
export async function startSuggestedMatch(sessionId: number): Promise<ActionResult> {
  const { freeTeams, timesMet } = await getTeamStatus(sessionId);
  const picked = pickOpponents(freeTeams, timesMet);
  if (!picked) return { error: "คู่ที่ว่างไม่ถึง 2 คู่ (คู่อื่นกำลังตีหรือรอคิวอยู่)" };

  return createMatch(sessionId, picked[0], picked[1]);
}

/** สร้างเกมใหม่ แล้วพาไปหน้านับแต้มทันที */
async function createMatch(
  sessionId: number,
  teamA: { id: number; memberIds: number[] },
  teamB: { id: number; memberIds: number[] },
): Promise<ActionResult> {
  const count = await db.match.count({ where: { sessionId } });

  const match = await db.match.create({
    data: {
      sessionId,
      number: count + 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      // จดไว้ด้วยว่าใครลงฝั่งไหน (ใช้คิดสถิติรายคน)
      players: {
        create: [
          ...teamA.memberIds.map((playerId) => ({ playerId, side: "A" as const })),
          ...teamB.memberIds.map((playerId) => ({ playerId, side: "B" as const })),
        ],
      },
    },
  });

  redirect(`/matches/${match.id}`);
}

/** ดูว่าตอนนี้คู่ไหนว่าง แต่ละคู่ตีไปกี่เกม และใครเจอใครไปแล้วบ้าง */
async function getTeamStatus(sessionId: number) {
  const [teams, matches] = await Promise.all([
    db.team.findMany({ where: { sessionId }, include: { members: true } }),
    db.match.findMany({ where: { sessionId } }),
  ]);

  const busyIds = new Set(
    matches
      .filter((m) => m.status !== "FINISHED")
      .flatMap((m) => [m.teamAId, m.teamBId]),
  );

  const met = new Map<string, number>();
  for (const m of matches) {
    if (m.teamAId && m.teamBId) {
      const key = pairKey(m.teamAId, m.teamBId);
      met.set(key, (met.get(key) ?? 0) + 1);
    }
  }

  const freeTeams = teams
    .filter((t) => !busyIds.has(t.id))
    .map((t) => ({
      id: t.id,
      memberIds: t.members.map((m) => m.playerId),
      gamesPlayed: matches.filter((m) => m.teamAId === t.id || m.teamBId === t.id).length,
    }));

  return { freeTeams, timesMet: (a: number, b: number) => met.get(pairKey(a, b)) ?? 0 };
}
