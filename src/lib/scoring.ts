// ===============================================================
//  กติกานับแต้มแบดมินตัน (แบบ Rally Point ตามกติกา BWF)
// ---------------------------------------------------------------
//  - ทุกลูกได้แต้ม ไม่ว่าใครเสิร์ฟ
//  - ถึง 21 แต้มก่อน และต้องนำห่าง 2 แต้ม (เช่น 21-19 จบ, 21-20 ต้องตีต่อ)
//  - ถ้าตีกันยืดเยื้อ ใครถึง 30 ก่อนชนะเลย (29-29 → ใครได้แต้มต่อไปชนะ)
//  ไฟล์นี้เป็นฟังก์ชันล้วนๆ ไม่ยุ่งกับ DB/หน้าเว็บ จึงใช้ได้ทั้งฝั่ง server และ browser
// ===============================================================

export type TeamSide = "A" | "B";

/** แต้มสูงสุดที่ตีได้ (21 → 30 ตามกติกา, 15 → 24, 11 → 20) */
export function maxPoints(pointsToWin: number): number {
  return pointsToWin + 9;
}

/** ดูว่ามีทีมชนะแล้วหรือยัง  คืนค่า "A" | "B" หรือ null ถ้ายังไม่จบ */
export function getWinner(
  scoreA: number,
  scoreB: number,
  pointsToWin: number,
): TeamSide | null {
  const cap = maxPoints(pointsToWin);
  if (scoreA >= cap) return "A";
  if (scoreB >= cap) return "B";

  const someoneReachedTarget = scoreA >= pointsToWin || scoreB >= pointsToWin;
  const leadByTwo = Math.abs(scoreA - scoreB) >= 2;
  if (someoneReachedTarget && leadByTwo) {
    return scoreA > scoreB ? "A" : "B";
  }
  return null;
}

/** ฝั่งที่ต้องยืนเสิร์ฟ: แต้มของทีมที่เสิร์ฟเป็นเลขคู่ → ขวา, เลขคี่ → ซ้าย */
export function serviceCourt(servingTeamScore: number): "ขวา" | "ซ้าย" {
  return servingTeamScore % 2 === 0 ? "ขวา" : "ซ้าย";
}

/** ข้อความบอกสถานะพิเศษ เช่น "เกมพอยต์" / "ดิวซ์" */
export function gameStatusText(
  scoreA: number,
  scoreB: number,
  pointsToWin: number,
): string | null {
  if (getWinner(scoreA, scoreB, pointsToWin)) return null;
  const cap = maxPoints(pointsToWin);
  const deuceStart = pointsToWin - 1;

  if (scoreA === cap - 1 && scoreB === cap - 1) return "แต้มตัดสิน! ใครได้แต้มนี้ชนะ";
  if (scoreA >= deuceStart && scoreA === scoreB) return "ดิวซ์ (ต้องนำ 2 แต้ม)";
  // ถ้าทีมไหนได้อีก 1 แต้มแล้วชนะ = เกมพอยต์
  if (getWinner(scoreA + 1, scoreB, pointsToWin) === "A") return "เกมพอยต์ ทีม A";
  if (getWinner(scoreA, scoreB + 1, pointsToWin) === "B") return "เกมพอยต์ ทีม B";
  return null;
}
