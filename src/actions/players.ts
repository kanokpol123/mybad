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
import { findAvatar } from "@/lib/avatars";
import { getInt, getString } from "@/lib/form-data";

export type FormState = { error?: string; success?: string };

/** เพิ่มผู้เล่นใหม่ (ใช้คู่กับ useActionState เพื่อแสดงข้อความ error ในฟอร์ม) */
export async function createPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = getString(formData, "name");

  if (!name) return { error: "กรุณาใส่ชื่อ" };
  if (name.length > 30) return { error: "ชื่อยาวเกิน 30 ตัวอักษร" };

  const existing = await db.player.findUnique({ where: { name } });
  if (existing) {
    // ถ้าเคยมีชื่อนี้แต่ถูกซ่อนไว้ ให้เปิดกลับมาใช้แทนการสร้างใหม่
    if (!existing.active) {
      await db.player.update({ where: { id: existing.id }, data: { active: true } });
      refresh();
      return { success: `เปิดใช้งาน "${name}" อีกครั้งแล้ว` };
    }
    return { error: `มีชื่อ "${name}" อยู่แล้ว` };
  }

  await db.player.create({ data: { name } });
  refresh(); // บอกหน้าเว็บให้โหลดข้อมูลใหม่ รายชื่อจะอัปเดตทันที
  return { success: `เพิ่ม "${name}" แล้ว` };
}

/** ซ่อน/เปิดผู้เล่น (ไม่ลบจริง เพื่อให้ประวัติการแข่งยังอยู่ครบ) */
export async function togglePlayerActive(formData: FormData) {
  const id = getInt(formData, "playerId", 1, Number.MAX_SAFE_INTEGER);
  const player = await db.player.findUniqueOrThrow({ where: { id } });
  await db.player.update({ where: { id }, data: { active: !player.active } });
  refresh();
}

/** แก้ชื่อ + เปลี่ยนตัวการ์ตูน (ใช้คู่กับ useActionState) */
export async function updatePlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = getInt(formData, "playerId", 1, Number.MAX_SAFE_INTEGER);
  const name = getString(formData, "name");
  const avatarId = getString(formData, "avatar");
  // รับเฉพาะรหัสที่มีอยู่จริงในรายการ (กันข้อมูลแปลกๆ เข้าฐานข้อมูล)
  const avatar = findAvatar(avatarId) ? avatarId : null;

  if (!name) return { error: "กรุณาใส่ชื่อ" };
  if (name.length > 30) return { error: "ชื่อยาวเกิน 30 ตัวอักษร" };

  const sameName = await db.player.findUnique({ where: { name } });
  if (sameName && sameName.id !== id) return { error: `มีชื่อ "${name}" อยู่แล้ว` };

  await db.player.update({ where: { id }, data: { name, avatar } });
  refresh();
  return { success: "บันทึกแล้ว" };
}
