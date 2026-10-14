// ===============================================================
//  Server Actions: จัดการผู้เล่น
// ---------------------------------------------------------------
//  "use server" = ฟังก์ชันในไฟล์นี้ทำงานบน server เท่านั้น
//  แต่หน้าเว็บ (ฝั่งเบราว์เซอร์) เรียกใช้ได้เหมือนฟังก์ชันธรรมดา
//  Next.js จะส่ง request ไปที่ server ให้เอง
// ===============================================================
"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getInt, getString } from "@/lib/form-data";

export type FormState = { error?: string; success?: string };

/** เพิ่มผู้เล่นใหม่ (ใช้คู่กับ useActionState เพื่อแสดงข้อความ error ในฟอร์ม) */
export async function createPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = getString(formData, "name");
  const level = getInt(formData, "level", 1, 5);

  if (!name) return { error: "กรุณาใส่ชื่อ" };
  if (name.length > 30) return { error: "ชื่อยาวเกิน 30 ตัวอักษร" };

  const existing = await db.player.findUnique({ where: { name } });
  if (existing) {
    // ถ้าเคยมีชื่อนี้แต่ถูกซ่อนไว้ ให้เปิดกลับมาใช้แทนการสร้างใหม่
    if (!existing.active) {
      await db.player.update({ where: { id: existing.id }, data: { active: true, level } });
      refresh();
      return { success: `เปิดใช้งาน "${name}" อีกครั้งแล้ว` };
    }
    return { error: `มีชื่อ "${name}" อยู่แล้ว` };
  }

  await db.player.create({ data: { name, level } });
  refresh(); // บอกหน้าเว็บให้โหลดข้อมูลใหม่ รายชื่อจะอัปเดตทันที
  return { success: `เพิ่ม "${name}" แล้ว` };
}

/** เปลี่ยนระดับฝีมือ */
export async function updatePlayerLevel(playerId: number, level: number) {
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new Error("ระดับต้องเป็น 1-5");
  await db.player.update({ where: { id: playerId }, data: { level } });
  refresh();
}

/** ซ่อน/เปิดผู้เล่น (ไม่ลบจริง เพื่อให้ประวัติการแข่งยังอยู่ครบ) */
export async function togglePlayerActive(formData: FormData) {
  const id = getInt(formData, "playerId", 1, Number.MAX_SAFE_INTEGER);
  const player = await db.player.findUniqueOrThrow({ where: { id } });
  await db.player.update({ where: { id }, data: { active: !player.active } });
  refresh();
}
