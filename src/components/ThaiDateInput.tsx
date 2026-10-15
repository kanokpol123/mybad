"use client";

import { useState } from "react";

/**
 * ช่องเลือกวันที่ แสดงเป็นภาษาไทย เช่น "วันเสาร์ 17 ตุลาคม 2569"
 * (ช่อง <input type="date"> ปกติจะแสดงตามภาษาของเบราว์เซอร์ บังคับเป็นไทยไม่ได้
 *  จึงซ่อนช่องจริงไว้ข้างใต้ แล้วโชว์ข้อความภาษาไทยแทน กดแล้วเปิดปฏิทินเหมือนเดิม)
 */
export default function ThaiDateInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue); // "YYYY-MM-DD"

  return (
    <div className="relative">
      <div className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5">
        <span>{value ? formatThaiLong(value) : "เลือกวันที่"}</span>
        <span aria-hidden>📅</span>
      </div>
      <input
        type="date"
        name={name}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        aria-label="วันที่"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

function formatThaiLong(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC", // ค่าในช่องเป็น "วันล้วนๆ" อ่านแบบ UTC วันจะได้ไม่เลื่อน
  });
}
