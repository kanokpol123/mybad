"use client";

import { useActionState } from "react";
import { createPlayer, type FormState } from "@/actions/players";
import SubmitButton from "./SubmitButton";

/**
 * ฟอร์มเพิ่มผู้เล่น
 * useActionState = เรียก Server Action แล้วเก็บผลลัพธ์ (error/success) ไว้แสดงในฟอร์ม
 */
export default function AddPlayerForm() {
  const [state, formAction] = useActionState<FormState, FormData>(createPlayer, {});

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="ชื่อเล่น เช่น บอส"
          maxLength={30}
          required
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
        />
        <select
          name="level"
          defaultValue="3"
          aria-label="ระดับฝีมือ"
          className="rounded-xl border border-slate-300 px-2"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              Lv.{n}
            </option>
          ))}
        </select>
        <SubmitButton>เพิ่ม</SubmitButton>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
