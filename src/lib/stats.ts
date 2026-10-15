// ===============================================================
//  คำนวณสถิติ / ตารางอันดับ จากเกมที่จบแล้ว
// ===============================================================

export type FinishedMatch = {
  scoreA: number;
  scoreB: number;
  players: { playerId: number; side: "A" | "B" }[];
};

export type PlayerStat = {
  playerId: number;
  name: string;
  avatar: string | null;
  played: number;
  wins: number;
  losses: number;
  winRate: number; // 0-100 (%)
  pointDiff: number; // แต้มได้ - แต้มเสีย รวมทุกเกม
};

export function computeStats(
  players: { id: number; name: string; avatar: string | null }[],
  matches: FinishedMatch[],
): PlayerStat[] {
  // เริ่มทุกคนที่ 0
  const table = new Map<number, PlayerStat>(
    players.map((p) => [
      p.id,
      { playerId: p.id, name: p.name, avatar: p.avatar, played: 0, wins: 0, losses: 0, winRate: 0, pointDiff: 0 },
    ]),
  );

  for (const m of matches) {
    const winner = m.scoreA > m.scoreB ? "A" : "B";
    for (const { playerId, side } of m.players) {
      const stat = table.get(playerId);
      if (!stat) continue;
      stat.played += 1;
      if (side === winner) stat.wins += 1;
      else stat.losses += 1;
      stat.pointDiff += side === "A" ? m.scoreA - m.scoreB : m.scoreB - m.scoreA;
    }
  }

  return [...table.values()]
    .filter((s) => s.played > 0)
    .map((s) => ({ ...s, winRate: Math.round((s.wins / s.played) * 100) }))
    // เรียงตาม: ชนะเยอะสุด → % ชนะ → ผลต่างแต้ม
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.pointDiff - a.pointDiff);
}
