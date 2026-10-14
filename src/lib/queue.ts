// ===============================================================
//  ระบบคิวลงสนาม: "ชนะอยู่ต่อ สูงสุด 2 เกม"
// ---------------------------------------------------------------
//  กติกา:
//   - เริ่มต้น เรียงคิวตามเลขคู่: คู่ 1 vs คู่ 2 ก่อน, คู่ 3, 4, ... รอคิว
//   - แพ้           → ไปต่อท้ายคิว
//   - ชนะ          → อยู่สนามต่อ เจอคู่หัวคิวถัดไป
//   - ชนะครบ 2 ติด → ต้องออก ไปต่อท้ายคิว (ต่อหลังคู่ที่แพ้ เพราะเพิ่งตีไป 2 เกม)
//
//  ไฟล์นี้ไม่ได้ "เก็บ" คิวไว้ที่ไหน แต่ "คำนวณใหม่" จากประวัติเกมทุกครั้ง
//  ข้อดี: ลบเกม / แก้คะแนน / เปิดเกมกลับมาแก้ คิวก็ถูกต้องเองอัตโนมัติ
// ===============================================================

export const MAX_WIN_STREAK = 2; // ชนะติดกันกี่เกมแล้วต้องออก

export type QueueMatch = {
  teamAId: number | null;
  teamBId: number | null;
  scoreA: number;
  scoreB: number;
  status: "WAITING" | "PLAYING" | "FINISHED";
  createdAt: Date;
  finishedAt: Date | null;
};

export type TeamQueueStatus =
  | { kind: "playing" } // กำลังตี หรือรอคอร์ทอยู่
  | { kind: "champion"; streak: number } // ชนะแล้ว รอเจอคู่ถัดไป
  | { kind: "queued"; position: number }; // รอคิว (ลำดับที่ 1, 2, 3, ...)

export type QueueState = {
  /** สถานะของแต่ละคู่ */
  status: Map<number, TeamQueueStatus>;
  /** ชนะติดกันอยู่กี่เกม (ใช้แสดงป้าย 🔥) */
  streak: Map<number, number>;
  /** เกมถัดไปควรเป็นคู่ไหนเจอคู่ไหน (null = คู่ว่างไม่พอ) */
  next: [number, number] | null;
};

export function computeQueue(teamIds: number[], matches: QueueMatch[]): QueueState {
  // คิวเริ่มต้น: เรียงตามเลขคู่ (teamIds ต้องเรียงมาแล้ว)
  let queue = [...teamIds];
  let champions: number[] = []; // คู่ที่ชนะแล้ว รอคู่ใหม่ (เรียงตามใครชนะก่อน)
  const streak = new Map<number, number>();
  const isMyTeam = (id: number | null): id is number => id !== null && teamIds.includes(id);

  // 1) ไล่ดูเกมที่จบแล้ว ตามลำดับเวลาที่จบ
  const finished = matches
    .filter((m) => m.status === "FINISHED" && isMyTeam(m.teamAId) && isMyTeam(m.teamBId))
    .sort((a, b) => time(a) - time(b));

  for (const m of finished) {
    const [winner, loser] =
      m.scoreA > m.scoreB ? [m.teamAId!, m.teamBId!] : [m.teamBId!, m.teamAId!];

    // ทั้งสองคู่ลงสนามไปแล้ว เอาออกจากคิวก่อน
    queue = queue.filter((id) => id !== winner && id !== loser);
    champions = champions.filter((id) => id !== winner && id !== loser);

    // คนแพ้ → ต่อท้ายคิว
    queue.push(loser);
    streak.set(loser, 0);

    // คนชนะ → นับชนะติด
    const wins = (streak.get(winner) ?? 0) + 1;
    if (wins >= MAX_WIN_STREAK) {
      queue.push(winner); // ชนะครบแล้ว ต้องออก (ต่อหลังคนแพ้)
      streak.set(winner, 0);
    } else {
      champions.push(winner); // อยู่สนามต่อ
      streak.set(winner, wins);
    }
  }

  // 2) คู่ที่กำลังตีอยู่ (หรือรอคอร์ท) ไม่ได้อยู่ในคิว
  const playing = new Set(
    matches
      .filter((m) => m.status !== "FINISHED")
      .flatMap((m) => [m.teamAId, m.teamBId])
      .filter(isMyTeam),
  );
  queue = queue.filter((id) => !playing.has(id));
  champions = champions.filter((id) => !playing.has(id));

  // 3) เกมถัดไป: ถ้ามีแชมป์รออยู่ → แชมป์ vs หัวคิว, ไม่มี → หัวคิว 2 คู่แรก
  let next: [number, number] | null = null;
  if (champions.length > 0 && queue.length > 0) next = [champions[0], queue[0]];
  else if (champions.length >= 2) next = [champions[0], champions[1]];
  else if (queue.length >= 2) next = [queue[0], queue[1]];

  // 4) สรุปสถานะของแต่ละคู่ ไว้แสดงผล
  const status = new Map<number, TeamQueueStatus>();
  for (const id of playing) status.set(id, { kind: "playing" });
  for (const id of champions) status.set(id, { kind: "champion", streak: streak.get(id) ?? 1 });
  queue.forEach((id, index) => status.set(id, { kind: "queued", position: index + 1 }));

  return { status, streak, next };
}

/** เวลาที่ใช้เรียงเกม: เวลาจบเกม (ถ้าไม่มี ใช้เวลาสร้างเกมแทน) */
function time(m: QueueMatch): number {
  return (m.finishedAt ?? m.createdAt).getTime();
}
