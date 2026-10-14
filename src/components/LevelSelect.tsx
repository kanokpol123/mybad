"use client";

import { useTransition } from "react";
import { updatePlayerLevel } from "@/actions/players";

/** เลือกระดับฝีมือ: เปลี่ยนปุ๊บบันทึกปั๊บ ไม่ต้องกดปุ่มบันทึก */
export default function LevelSelect({ playerId, level }: { playerId: number; level: number }) {
  // useTransition ให้ค่า isPending มาบอกว่ากำลังบันทึกอยู่หรือเปล่า
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={level}
      disabled={isPending}
      aria-label="ระดับฝีมือ"
      onChange={(e) => {
        const newLevel = Number(e.target.value);
        startTransition(() => updatePlayerLevel(playerId, newLevel));
      }}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          Lv.{n}
        </option>
      ))}
    </select>
  );
}
