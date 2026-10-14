// ===============================================================
//  ตัวเชื่อมต่อฐานข้อมูล (Prisma Client)
// ---------------------------------------------------------------
//  ใช้งาน:  import { db } from "@/lib/db"
//           const players = await db.player.findMany()
// ===============================================================
import "server-only"; // กันไม่ให้ไฟล์นี้หลุดไปฝั่งเบราว์เซอร์ (รหัส DB จะรั่ว)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  // ลิงก์จาก Neon เป็น "sslmode=require" ซึ่ง library pg จะขึ้นคำเตือน SECURITY WARNING ทุกครั้ง
  // เปลี่ยนเป็น "verify-full" ให้ตรงกับที่ pg ทำอยู่แล้วจริงๆ (ความปลอดภัยเท่าเดิม) คำเตือนจะหายไป
  const connectionString = process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=verify-full");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// ตอนพัฒนา (npm run dev) Next.js จะโหลดโค้ดใหม่ทุกครั้งที่เราเซฟไฟล์
// ถ้าไม่เก็บ client ไว้ใน globalThis จะเปิด connection ใหม่เรื่อยๆ จน DB เต็ม
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
