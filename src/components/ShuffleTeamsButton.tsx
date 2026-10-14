"use client";

import { useState, useTransition } from "react";
import { shuffleTeams } from "@/actions/sessions";

/** ปุ่มสุ่มคู่หูใหม่ (ถามยืนยันก่อน เพราะคู่หูเดิมจะหายไป) */
export default function ShuffleTeamsButton({
  sessionId,
  hasTeams,
}: {
  sessionId: number;
  hasTeams: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleClick() {
    if (hasTeams && !confirm("สุ่มคู่หูใหม่? (เกมที่ตีจบไปแล้วยังอยู่ครบ)")) return;
    setError(undefined);
    startTransition(async () => {
      const result = await shuffleTeams(sessionId);
      setError(result.error);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`w-full rounded-xl px-4 py-2.5 font-medium disabled:opacity-50 ${
          hasTeams ? "border border-slate-300 bg-white text-slate-700" : "bg-brand text-white"
        }`}
      >
        {isPending ? "กำลังสุ่ม..." : hasTeams ? "🔄 สุ่มคู่หูใหม่" : "🎲 สุ่มคู่หู"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
