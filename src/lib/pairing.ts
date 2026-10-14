// ===============================================================
//  อัลกอริทึมสุ่มคู่
// ---------------------------------------------------------------
//  มี 2 งาน:
//
//  1) makeTeams()     — สุ่ม "คู่หูประจำสัปดาห์" ครั้งเดียวตอนเริ่มนัด
//     สุ่มจัดหลายร้อยแบบ แล้วให้ "คะแนนความแย่" กับแต่ละแบบ
//       - เคยเป็นคู่กันในสัปดาห์ก่อนๆ → แย่มาก (อยากให้ได้คู่ใหม่ทุกสัปดาห์)
//       - ฝีมือแต่ละคู่ต่างกันมาก      → แย่ (อยากให้เก่งจับคู่กับมือใหม่)
//     แล้วเลือกแบบที่ "แย่น้อยที่สุด"
//
//  2) pickOpponents() — ช่วยเลือกว่า "คู่ไหนเจอคู่ไหน" ในเกมถัดไป
//     เลือกคู่ที่ตีน้อยที่สุด และยังไม่ค่อยได้เจอกัน
//
//  ไฟล์นี้ไม่ยุ่งกับฐานข้อมูลเลย รับข้อมูลเข้า → คืนผลลัพธ์ออก
//  ทำให้ทดสอบง่าย และแก้กติกาการสุ่มได้ที่นี่ที่เดียว
// ===============================================================

export type PairingPlayer = {
  id: number;
  level: number; // ระดับฝีมือ 1-5
};

/** คู่หูในสัปดาห์ก่อนๆ ใช้ดูว่าใครเคยคู่กับใครแล้ว */
export type PastTeam = {
  memberIds: number[];
  weight: number; // ความสำคัญ: สัปดาห์ล่าสุดสำคัญที่สุด
};

// น้ำหนักของ "ความแย่" แต่ละแบบ ปรับตัวเลขได้ตามใจก๊วน
const PENALTY_SAME_PARTNER = 10;
const PENALTY_LEVEL_GAP = 4;
const TRIES = 1000; // สุ่มลองกี่แบบ (เยอะ = ดีขึ้นแต่ช้าลง ซึ่ง 1000 ก็เร็วมากแล้ว)

// ---------------------------------------------------------------
//  งานที่ 1: สุ่มคู่หูประจำสัปดาห์
// ---------------------------------------------------------------
export function makeTeams(
  players: PairingPlayer[],
  teamSize: 1 | 2,
  history: PastTeam[],
): PairingPlayer[][] {
  // ตีเดี่ยว: ทุกคนเป็นทีมของตัวเอง ไม่ต้องสุ่ม
  if (teamSize === 1) return shuffle(players).map((p) => [p]);
  if (players.length < 2) return [players];

  const partnerCount = countPartners(history);
  const averageLevel = players.reduce((s, p) => s + p.level, 0) / players.length;

  let best: PairingPlayer[][] = [];
  let bestCost = Infinity;

  for (let i = 0; i < TRIES; i++) {
    const candidate = splitIntoPairs(shuffle(players));
    const cost = candidate.reduce(
      (sum, team) => sum + teamCost(team, partnerCount, averageLevel),
      0,
    );
    if (cost < bestCost) {
      best = candidate;
      bestCost = cost;
    }
  }
  return best;
}

/** คิด "คะแนนความแย่" ของ 1 คู่ (ยิ่งน้อยยิ่งดี) */
function teamCost(team: PairingPlayer[], partnerCount: Map<string, number>, averageLevel: number) {
  let cost = 0;

  // เคยคู่กันมาแล้ว
  for (const [a, b] of pairsWithin(team)) {
    cost += (partnerCount.get(pairKey(a.id, b.id)) ?? 0) * PENALTY_SAME_PARTNER;
  }

  // ฝีมือเฉลี่ยของคู่นี้ ห่างจากฝีมือเฉลี่ยของทั้งก๊วนแค่ไหน
  // (ทุกคู่ใกล้ค่าเฉลี่ย = ทุกคู่สูสีกัน)
  const teamLevel = team.reduce((s, p) => s + p.level, 0) / team.length;
  cost += Math.abs(teamLevel - averageLevel) * PENALTY_LEVEL_GAP;

  return cost;
}

/** นับว่าแต่ละคู่ (a,b) เคยเป็นคู่หูกันมาแล้วเท่าไหร่ (คิดตามน้ำหนัก) */
function countPartners(history: PastTeam[]) {
  const counts = new Map<string, number>();
  for (const team of history) {
    for (const [a, b] of pairsWithin(team.memberIds)) {
      const key = pairKey(a, b);
      counts.set(key, (counts.get(key) ?? 0) + team.weight);
    }
  }
  return counts;
}

/** แบ่งเป็นคู่ๆ: [a,b,c,d,e] → [a,b] [c,d,e]  (ถ้าคี่ คนสุดท้ายไปอยู่คู่สุดท้ายเป็น 3 คน) */
function splitIntoPairs(list: PairingPlayer[]): PairingPlayer[][] {
  const teams: PairingPlayer[][] = [];
  for (let i = 0; i + 2 <= list.length; i += 2) {
    teams.push(list.slice(i, i + 2));
  }
  if (list.length % 2 === 1) teams[teams.length - 1].push(list[list.length - 1]);
  return teams;
}

// ---------------------------------------------------------------
//  งานที่ 2: เลือกคู่แข่งสำหรับเกมถัดไป
// ---------------------------------------------------------------
export type TeamForMatch = {
  id: number;
  level: number; // ฝีมือเฉลี่ยของคู่
  gamesPlayed: number; // วันนี้ตีไปแล้วกี่เกม
};

/**
 * เลือก 2 คู่ที่ควรเจอกันเกมถัดไป
 * @param freeTeams    คู่ที่ว่าง (ไม่ได้ตีอยู่หรือรอคิวอยู่)
 * @param timesMet     ฟังก์ชันบอกว่าคู่ a กับ b เจอกันมาแล้วกี่เกมวันนี้
 * @returns [คู่ A, คู่ B] หรือ null ถ้าคู่ว่างไม่ถึง 2 คู่
 */
export function pickOpponents<T extends TeamForMatch>(
  freeTeams: T[],
  timesMet: (a: number, b: number) => number,
): [T, T] | null {
  let best: [T, T] | null = null;
  let bestCost = Infinity;

  // ลองจับทุกคู่ที่เป็นไปได้ (สลับลำดับก่อน ถ้าคะแนนเท่ากันจะได้สุ่มจริงๆ)
  for (const [a, b] of pairsWithin(shuffle(freeTeams))) {
    const cost =
      (a.gamesPlayed + b.gamesPlayed) * 10 + // ตีน้อยได้ลงก่อน
      timesMet(a.id, b.id) * 6 + // ยังไม่เคยเจอกันได้ก่อน
      Math.abs(a.level - b.level) * 2; // ฝีมือใกล้กันได้ก่อน
    if (cost < bestCost) {
      best = [a, b];
      bestCost = cost;
    }
  }
  return best;
}

// ---------------------------------------------------------------
//  ฟังก์ชันช่วยเล็กๆ
// ---------------------------------------------------------------

/** ทุกคู่ที่เป็นไปได้: [a,b,c] → [a,b] [a,c] [b,c] */
function pairsWithin<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) pairs.push([items[i], items[j]]);
  }
  return pairs;
}

/** สร้าง key ของคู่ ให้ (3,7) กับ (7,3) ได้ key เดียวกัน */
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** สลับลำดับแบบสุ่ม (Fisher–Yates shuffle) คืน array ใหม่ ไม่แก้ของเดิม */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
