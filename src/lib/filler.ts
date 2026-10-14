// ===============================================================
//  ตัวเติม: หาคนมาลงคู่กับ "คนที่เป็นเศษ" (ตอนคนมาเป็นเลขคี่)
// ---------------------------------------------------------------
//  คนที่เป็นเศษได้ช่องในคิวเหมือนคู่ปกติ พอถึงคิว ต้องหาคนว่างมาเติมเป็นคู่ 1 เกม
//  ระบบเสนอชื่อตามลำดับนี้:
//   1) ถ้าช่องตัวเติมเพิ่งชนะ (อยู่สนามต่อ) → ตัวเติมคนเดิมอยู่ต่อ
//   2) คนที่ตีน้อยที่สุดวันนี้ได้ก่อน
//   3) ถ้าเท่ากัน → คนที่คู่ของตัวเองยังอีกนานกว่าจะถึงคิว (จะได้ไม่ชนเกมตัวเอง)
//  คนที่เข้าข่ายไม่ได้: คนที่กำลังตีอยู่, คู่ที่จะเจอกันเกมนี้, คู่ที่ชนะแล้วรออยู่สนาม
// ===============================================================
import type { TeamQueueStatus } from "./queue";

export type FillerCandidate = { playerId: number; gamesPlayed: number };

export function suggestFillers(input: {
  soloTeamId: number;
  opponentTeamId: number;
  teams: { id: number; memberIds: number[] }[];
  queueStatus: Map<number, TeamQueueStatus>;
  /** เกมทั้งหมดวันนี้ (ใครลงตีบ้าง ใช้นับจำนวนเกม และหาตัวเติมคนล่าสุด) */
  matches: {
    teamAId: number | null;
    teamBId: number | null;
    createdAt: Date;
    players: { playerId: number; side: "A" | "B" }[];
  }[];
}): FillerCandidate[] {
  const { soloTeamId, opponentTeamId, teams, queueStatus, matches } = input;

  const gamesPlayed = (playerId: number) =>
    matches.filter((m) => m.players.some((p) => p.playerId === playerId)).length;

  // คนที่เติมให้ได้: อยู่ในคู่ที่ "รอคิว" เท่านั้น
  const candidates = teams
    .filter((t) => t.id !== soloTeamId && t.id !== opponentTeamId)
    .filter((t) => queueStatus.get(t.id)?.kind === "queued")
    .flatMap((t) => {
      const status = queueStatus.get(t.id) as { kind: "queued"; position: number };
      return t.memberIds.map((playerId) => ({
        playerId,
        gamesPlayed: gamesPlayed(playerId),
        queuePosition: status.position,
      }));
    })
    .sort(
      (a, b) =>
        a.gamesPlayed - b.gamesPlayed || // ตีน้อยได้ก่อน
        b.queuePosition - a.queuePosition, // คู่ตัวเองอยู่ท้ายคิวได้ก่อน
    );

  // ช่องตัวเติมเพิ่งชนะ → เอาตัวเติมคนเดิมขึ้นก่อน (ถ้ายังว่างอยู่)
  if (queueStatus.get(soloTeamId)?.kind === "champion") {
    const soloMember = teams.find((t) => t.id === soloTeamId)?.memberIds[0];
    const lastMatch = matches
      .filter((m) => m.teamAId === soloTeamId || m.teamBId === soloTeamId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    // ตัวเติมคนล่าสุด = คนที่ลงฝั่งเดียวกับคนเป็นเศษ แต่ไม่ใช่ตัวเขาเอง
    const soloSide = lastMatch?.teamAId === soloTeamId ? "A" : "B";
    const lastFiller = lastMatch?.players.find(
      (p) => p.side === soloSide && p.playerId !== soloMember && candidates.some((c) => c.playerId === p.playerId),
    )?.playerId;
    if (lastFiller !== undefined) {
      candidates.sort((a, b) => Number(b.playerId === lastFiller) - Number(a.playerId === lastFiller));
    }
  }

  return candidates.map(({ playerId, gamesPlayed }) => ({ playerId, gamesPlayed }));
}
