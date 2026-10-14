"use client";

import { useState, useTransition } from "react";
import { startNextMatch } from "@/actions/sessions";

/** ปุ่มใหญ่ "เริ่มเกมถัดไป" — เรียกคู่ตามคิวให้อัตโนมัติ แล้วพาไปหน้านับแต้ม */
export default function NextMatchButton({
  sessionId,
  label,
}: {
  sessionId: number;
  /** ข้อความบอกว่าใครเจอใคร เช่น "คู่ 1 vs คู่ 3" (null = ยังเริ่มไม่ได้) */
  label: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleClick() {
    setError(undefined);
    startTransition(async () => {
      const result = await startNextMatch(sessionId);
      setError(result.error);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending || label === null}
        className="w-full rounded-2xl bg-brand px-4 py-3.5 text-white shadow-sm disabled:opacity-40"
      >
        <span className="block text-lg font-semibold">
          {isPending ? "กำลังเริ่ม..." : "▶️ เริ่มเกมถัดไป"}
        </span>
        <span className="block text-sm opacity-90">{label ?? "รอคู่ที่กำลังตีอยู่จบก่อน"}</span>
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
