// ===============================================================
//  อัลกอริทึมสุ่มคู่หู
// ---------------------------------------------------------------
//  makeTeams() — สุ่ม "คู่หูประจำสัปดาห์" ครั้งเดียวตอนเริ่มนัด
//     สุ่มจัดหลายร้อยแบบ แล้วให้ "คะแนนความซ้ำ" กับแต่ละแบบ
//       - เคยเป็นคู่กันในสัปดาห์ก่อนๆ → ซ้ำ (ยิ่งเพิ่งคู่กันเมื่อไม่นาน ยิ่งซ้ำมาก)
//     แล้วเลือกแบบที่ "ซ้ำน้อยที่สุด" → ได้คู่ใหม่ทุกสัปดาห์
//
//  (ส่วน "คู่ไหนเจอคู่ไหน" ดูที่ lib/queue.ts)
//
//  ไฟล์นี้ไม่ยุ่งกับฐานข้อมูลเลย รับข้อมูลเข้า → คืนผลลัพธ์ออก
//  ทำให้ทดสอบง่าย และแก้กติกาการสุ่มได้ที่นี่ที่เดียว
// ===============================================================

export type PairingPlayer = {
  id: number;
};

/** คู่หูในสัปดาห์ก่อนๆ ใช้ดูว่าใครเคยคู่กับใครแล้ว */
export type PastTeam = {
  memberIds: number[];
  weight: number; // ความสำคัญ: สัปดาห์ล่าสุดสำคัญที่สุด
};

const TRIES = 1000; // สุ่มลองกี่แบบ (เยอะ = ดีขึ้นแต่ช้าลง ซึ่ง 1000 ก็เร็วมากแล้ว)

export function makeTeams<T extends PairingPlayer>(
  players: T[],
  teamSize: 1 | 2,
  history: PastTeam[],
): T[][] {
  // ตีเดี่ยว: ทุกคนเป็นทีมของตัวเอง ไม่ต้องสุ่ม
  if (teamSize === 1) return shuffle(players).map((p) => [p]);
  if (players.length < 2) return [players];

  const partnerCount = countPartners(history);

  let best: T[][] = [];
  let bestCost = Infinity;

  for (let i = 0; i < TRIES; i++) {
    const candidate = splitIntoPairs(shuffle(players));
    const cost = candidate.reduce((sum, team) => sum + repeatCost(team, partnerCount), 0);
    if (cost < bestCost) {
      best = candidate;
      bestCost = cost;
    }
    if (bestCost === 0) break; // ไม่มีคู่ซ้ำเลย ดีที่สุดแล้ว ไม่ต้องหาต่อ
  }
  return best;
}

/** คิด "คะแนนความซ้ำ" ของ 1 คู่: เคยคู่กันมาแล้วกี่ครั้ง (ยิ่งน้อยยิ่งดี) */
function repeatCost(team: PairingPlayer[], partnerCount: Map<string, number>) {
  let cost = 0;
  for (const [a, b] of pairsWithin(team)) {
    cost += partnerCount.get(pairKey(a.id, b.id)) ?? 0;
  }
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
function splitIntoPairs<T>(list: T[]): T[][] {
  const teams: T[][] = [];
  for (let i = 0; i + 2 <= list.length; i += 2) {
    teams.push(list.slice(i, i + 2));
  }
  if (list.length % 2 === 1) teams[teams.length - 1].push(list[list.length - 1]);
  return teams;
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
function pairKey(a: number, b: number): string {
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
