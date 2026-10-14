"use client";

import { useActionState } from "react";
import { lockPair, type ActionResult } from "@/actions/sessions";
import SubmitButton from "./SubmitButton";

/** จับคู่เอง: เลือก 2 คน → ล็อกเป็นคู่กัน แล้วสุ่มคนที่เหลือใหม่ */
export default function LockPairForm({
  sessionId,
  players,
}: {
  sessionId: number;
  players: { id: number; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(lockPair, {});
  const selectClass = "min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2 py-2";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-center gap-2">
        <select name="playerA" required defaultValue="" aria-label="คนที่ 1" className={selectClass}>
          <option value="" disabled>
            เลือกคนที่ 1
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-slate-400">&</span>
        <select name="playerB" required defaultValue="" aria-label="คนที่ 2" className={selectClass}>
          <option value="" disabled>
            เลือกคนที่ 2
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton variant="secondary" className="w-full">
        🔒 ล็อกคู่นี้ แล้วสุ่มคนที่เหลือใหม่
      </SubmitButton>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
