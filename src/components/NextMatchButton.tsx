"use client";

import { useState, useTransition } from "react";
import { startNextMatch } from "@/actions/sessions";

type FillerChoice = {
  soloName: string; // คนที่เป็นเศษ
  options: { id: number; name: string; gamesPlayed: number }[]; // เรียงตามที่ระบบแนะนำ (คนแรก = แนะนำ)
};

/** ปุ่มใหญ่ "เริ่มเกมถัดไป" — เรียกคู่ตามคิวให้อัตโนมัติ แล้วพาไปหน้านับแต้ม */
export default function NextMatchButton({
  sessionId,
  label,
  filler,
}: {
  sessionId: number;
  /** ข้อความบอกว่าใครเจอใคร เช่น "คู่ 1 vs คู่ 3" (null = ยังเริ่มไม่ได้) */
  label: string | null;
  /** ถ้าเกมถัดไปมีคนที่เป็นเศษ ต้องเลือกตัวเติม (null = ไม่ต้อง) */
  filler: FillerChoice | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [fillerId, setFillerId] = useState<number | undefined>(filler?.options[0]?.id);

  // ถ้าคนที่แนะนำเปลี่ยน (เช่น เกมก่อนหน้าจบ) ให้กลับไปใช้คนที่แนะนำใหม่
  const suggested = filler?.options[0]?.id;
  const [lastSuggested, setLastSuggested] = useState(suggested);
  if (suggested !== lastSuggested) {
    setLastSuggested(suggested);
    setFillerId(suggested);
  }

  const missingFiller = filler !== null && fillerId === undefined;

  function handleClick() {
    setError(undefined);
    startTransition(async () => {
      const result = await startNextMatch(sessionId, filler ? (fillerId ?? null) : null);
      setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      {filler && (
        <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="shrink-0">ตัวเติมของ {filler.soloName}:</span>
          {filler.options.length > 0 ? (
            <select
              value={fillerId}
              onChange={(e) => setFillerId(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1"
            >
              {filler.options.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {p.name} (ตีแล้ว {p.gamesPlayed} เกม){i === 0 ? " ⭐ แนะนำ" : ""}
                </option>
              ))}
            </select>
          ) : (
            <span>ยังไม่มีคนว่าง</span>
          )}
        </label>
      )}

      <button
        onClick={handleClick}
        disabled={isPending || label === null || missingFiller}
        className="w-full rounded-2xl bg-brand px-4 py-3.5 text-white shadow-sm disabled:opacity-40"
      >
        <span className="block text-lg font-semibold">
          {isPending ? "กำลังเริ่ม..." : "▶️ เริ่มเกมถัดไป"}
        </span>
        <span className="block text-sm opacity-90">{label ?? "รอคู่ที่กำลังตีอยู่จบก่อน"}</span>
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
