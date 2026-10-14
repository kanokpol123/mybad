"use client";

import { useState } from "react";

type Row = { key: number; a: string; b: string };

/**
 * เลือกคู่ที่ต้องการล็อกตั้งแต่ตอนสร้างนัด (เพิ่มได้หลายคู่)
 * ค่าที่ส่งไปกับฟอร์ม: lockA[] และ lockB[] (แถวเดียวกัน = คู่เดียวกัน)
 */
export default function LockedPairsInput({ players }: { players: { id: number; name: string }[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [nextKey, setNextKey] = useState(1);

  // คนที่ถูกเลือกไปแล้วในช่องอื่น จะเลือกซ้ำไม่ได้
  const chosen = rows.flatMap((r) => [r.a, r.b]).filter(Boolean);

  function addRow() {
    setRows([...rows, { key: nextKey, a: "", b: "" }]);
    setNextKey(nextKey + 1);
  }

  function update(key: number, field: "a" | "b", value: string) {
    setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function removeRow(key: number) {
    setRows(rows.filter((r) => r.key !== key));
  }

  function renderSelect(row: Row, field: "a" | "b") {
    const current = row[field];
    return (
      <select
        name={field === "a" ? "lockA" : "lockB"}
        value={current}
        onChange={(e) => update(row.key, field, e.target.value)}
        aria-label={field === "a" ? "คนที่ 1" : "คนที่ 2"}
        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2 py-2"
      >
        <option value="">เลือก...</option>
        {players.map((p) => (
          <option key={p.id} value={p.id} disabled={String(p.id) !== current && chosen.includes(String(p.id))}>
            {p.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          {renderSelect(row, "a")}
          <span className="text-slate-400">&</span>
          {renderSelect(row, "b")}
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            aria-label="ลบคู่นี้"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={players.length < 2}
        className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm text-slate-600 disabled:opacity-40"
      >
        + เพิ่มคู่ที่ล็อก
      </button>
    </div>
  );
}
