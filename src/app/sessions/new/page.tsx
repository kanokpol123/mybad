// ===============================================================
//  หน้า "/sessions/new" : สร้างนัดตีใหม่
// ===============================================================
import { Suspense } from "react";
import { connection } from "next/server";
import { createSession } from "@/actions/sessions";
import LockedPairsInput from "@/components/LockedPairsInput";
import PageHeader from "@/components/PageHeader";
import PlayerCheckboxes from "@/components/PlayerCheckboxes";
import SubmitButton from "@/components/SubmitButton";
import LoadingScreen from "@/components/LoadingScreen";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export default function NewSessionPage() {
  // ส่วนที่ดึงข้อมูลจาก DB ต้องอยู่ใน <Suspense> ระหว่างรอจะแสดง LoadingScreen
  // (Next.js 16 บังคับ เพื่อให้กดลิงก์แล้วหน้าเปลี่ยนทันที ไม่ค้าง)
  return (
    <Suspense fallback={<LoadingScreen />}>
      <NewSessionPageContent />
    </Suspense>
  );
}

async function NewSessionPageContent() {
  await connection();

  const players = await db.player.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="สร้างนัดตีใหม่" backHref="/" />

      {/* action={createSession} = กดส่งฟอร์มแล้วเรียกฟังก์ชันนี้บน server */}
      <form action={createSession} className="space-y-6">
        <Field label="วันที่">
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInputValue(new Date())}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ประเภท">
            <select name="matchType" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">
              <option value="DOUBLES">คู่</option>
              <option value="SINGLES">เดี่ยว</option>
            </select>
          </Field>
          <Field label="แต้มต่อเกม">
            <select
              name="pointsToWin"
              defaultValue="11"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="11">11</option>
              <option value="15">15</option>
              <option value="21">21</option>
            </select>
          </Field>
        </div>

        <Field label="ใครมาบ้าง? (แก้ทีหลังได้)">
          <PlayerCheckboxes players={players} />
        </Field>

        <Field label="ล็อกคู่ไว้ก่อนสุ่ม (ไม่บังคับ • เฉพาะตีคู่)">
          <LockedPairsInput players={players} />
        </Field>

        <SubmitButton className="w-full py-3.5 text-lg">🎲 สร้างนัด + สุ่มคู่หู</SubmitButton>
      </form>
    </>
  );
}

/** กล่องป้ายชื่อ + ช่องกรอก (ใช้ซ้ำในไฟล์นี้) */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-600">{label}</p>
      {children}
    </div>
  );
}
