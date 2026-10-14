// ===============================================================
//  Server Actions: นับแต้มและจบเกม
// ===============================================================
"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWinner, maxPoints, type TeamSide } from "@/lib/scoring";

/**
 * บันทึกคะแนนทุกครั้งที่กดแต้ม
 * → ต่อให้มือถือแบตหมด/ปิดแอป คะแนนก็ไม่หาย เปิดเครื่องไหนก็เห็นคะแนนเดียวกัน
 */
export async function saveScore(
  matchId: number,
  scoreA: number,
  scoreB: number,
  servingSide: TeamSide | null,
) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { session: true },
  });
  if (match.status === "FINISHED") throw new Error("เกมนี้จบไปแล้ว");

  const cap = maxPoints(match.session.pointsToWin);
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= cap;
  if (!valid(scoreA) || !valid(scoreB)) throw new Error("คะแนนไม่ถูกต้อง");

  const notStarted = scoreA === 0 && scoreB === 0;
  await db.match.update({
    where: { id: matchId },
    data: {
      scoreA,
      scoreB,
      servingSide: notStarted ? null : servingSide,
      status: notStarted ? "WAITING" : "PLAYING",
    },
  });
}

/** กดยืนยันจบเกม (ต้องมีผู้ชนะตามกติกาแล้วเท่านั้น) */
export async function finishMatch(matchId: number) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { session: true },
  });
  if (!getWinner(match.scoreA, match.scoreB, match.session.pointsToWin)) {
    throw new Error("ยังไม่มีทีมชนะ");
  }
  await db.match.update({ where: { id: matchId }, data: { status: "FINISHED", finishedAt: new Date() } });
  redirect(`/sessions/${match.sessionId}`);
}

/** เปิดเกมที่จบแล้วกลับมาแก้คะแนน (เผื่อกดผิด) */
export async function reopenMatch(matchId: number) {
  await db.match.update({ where: { id: matchId }, data: { status: "PLAYING", finishedAt: null } });
  refresh();
}

/** ลบเกมที่ยังไม่จบ (เช่น เริ่มผิดคู่ หรือเลิกตีกลางคัน) */
export async function deleteMatch(matchId: number) {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) redirect("/"); // ถูกลบไปแล้ว (เช่น อีกเครื่องลบไปก่อน)
  if (match.status === "FINISHED") throw new Error("เกมที่จบแล้วลบไม่ได้");

  await db.match.delete({ where: { id: matchId } });
  redirect(`/sessions/${match.sessionId}`);
}
