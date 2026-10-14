// ===============================================================
//  ใส่ข้อมูลตัวอย่าง (ผู้เล่น 8 คน) ไว้ลองเล่น
//  รัน:  npm run db:seed
// ===============================================================
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SAMPLE_PLAYERS = ["บอส", "เจ", "มิ้นท์", "ต้น", "แพร", "โอ๊ต", "ฝน", "กาย"];

async function main() {
  for (const name of SAMPLE_PLAYERS) {
    // upsert = มีอยู่แล้วก็ข้าม ไม่มีก็สร้าง (รันซ้ำได้ไม่พัง)
    await db.player.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`✅ เพิ่มผู้เล่นตัวอย่าง ${SAMPLE_PLAYERS.length} คนแล้ว`);
}

main().finally(() => db.$disconnect());
