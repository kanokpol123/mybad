"use client";

import { useActionState, useState, useTransition } from "react";
import { startMatch, startSuggestedMatch, type ActionResult } from "@/actions/sessions";

type TeamOption = {
  id: number;
  number: number;
  names: string; // "บอส & มิ้นท์"
  gamesPlayed: number;
  busy: boolean; // กำลังตีอยู่หรือรอคิวอยู่
};

/**
 * เริ่มเกมใหม่: แตะเลือก 2 คู่แล้วกด "เริ่มเกม"
 * หรือกด "สุ่มคู่แข่งให้" ให้ระบบเลือกคู่ที่ตีน้อยสุดให้เอง
 */
export default function StartMatchForm({ sessionId, teams }: { sessionId: number; teams: TeamOption[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [state, formAction, isStarting] = useActionState<ActionResult, FormData>(startMatch, {});
  const [isSuggesting, startSuggesting] = useTransition();
  const [suggestError, setSuggestError] = useState<string>();
  const pending = isStarting || isSuggesting;

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id) // แตะซ้ำ = ยกเลิก
        : current.length < 2
          ? [...current, id]
          : [current[1], id], // เลือกครบ 2 แล้ว แตะคู่ใหม่ = แทนคู่ที่เลือกก่อน
    );
  }

  function suggest() {
    setSuggestError(undefined);
    startSuggesting(async () => {
      const result = await startSuggestedMatch(sessionId);
      setSuggestError(result.error);
    });
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
              <span className="text-xs text-slate-500">
                {team.busy ? "กำลังตี/รอคิว" : `ตีแล้ว ${team.gamesPlayed} เกม`}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || selected.length !== 2}
          className="flex-1 rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          {isStarting ? "กำลังเริ่ม..." : "▶️ เริ่มเกม"}
        </button>
        <button
          type="button"
          onClick={suggest}
          disabled={pending}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 disabled:opacity-40"
        >
          {isSuggesting ? "กำลังสุ่ม..." : "🎲 สุ่มคู่แข่งให้"}
        </button>
      </div>

      {(state.error || suggestError) && (
        <p className="text-sm text-red-600">{state.error ?? suggestError}</p>
      )}
    </form>
  );
}
