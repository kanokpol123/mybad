"use client";

import { useActionState, useState } from "react";
import { startMatch, type ActionResult } from "@/actions/sessions";

type TeamOption = {
  id: number;
  number: number;
  names: string; // "บอส & มิ้นท์"
  busy: boolean; // กำลังตีอยู่
};

/** เลือกคู่เอง (กรณีพิเศษ เช่น อยากจัดคู่ข้ามคิว): แตะเลือก 2 คู่แล้วกด "เริ่มเกม" */
export default function StartMatchForm({ sessionId, teams }: { sessionId: number; teams: TeamOption[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [state, formAction, isStarting] = useActionState<ActionResult, FormData>(startMatch, {});

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id) // แตะซ้ำ = ยกเลิก
        : current.length < 2
          ? [...current, id]
          : [current[1], id], // เลือกครบ 2 แล้ว แตะคู่ใหม่ = แทนคู่ที่เลือกก่อน
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="grid gap-2">
        {teams.map((team) => {
          const isSelected = selected.includes(team.id);
          return (
            <label
              key={team.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${
                team.busy
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  : isSelected
                    ? "border-brand bg-brand/10"
                    : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="checkbox"
                name="teamIds"
                value={team.id}
                checked={isSelected}
                disabled={team.busy}
                onChange={() => toggle(team.id)}
                className="size-5 accent-brand"
              />
              <span className="w-12 shrink-0 text-sm text-slate-500">คู่ {team.number}</span>
              <span className="flex-1 truncate font-medium">{team.names}</span>
              {team.busy && <span className="text-xs">กำลังตี</span>}
            </label>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={isStarting || selected.length !== 2}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 disabled:opacity-40"
      >
        {isStarting ? "กำลังเริ่ม..." : "เริ่มเกมด้วยคู่ที่เลือก"}
      </button>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
