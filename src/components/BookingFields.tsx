/** ช่องกรอกเวลาที่จอง + เลขคอร์ท (ใช้ทั้งหน้าสร้างนัดและตอนแก้ไขนัด) */
export default function BookingFields({
  defaults,
}: {
  defaults?: { startTime: string | null; endTime: string | null; courtName: string | null };
}) {
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-2 py-2.5";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-600";

  return (
    <div className="grid grid-cols-3 gap-3">
      <label>
        <span className={labelClass}>เริ่ม</span>
        <TimeSelect name="startTime" defaultValue={defaults?.startTime} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>ถึง</span>
        <TimeSelect name="endTime" defaultValue={defaults?.endTime} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>คอร์ท</span>
        <input
          name="courtName"
          maxLength={30}
          placeholder="เช่น A6"
          defaultValue={defaults?.courtName ?? ""}
          className={inputClass}
        />
      </label>
    </div>
  );
}

// เวลาให้เลือก ทุกครึ่งชั่วโมง แบบ 24 ชั่วโมง: "06:00", "06:30", ..., "23:30"
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** เลือกเวลาแบบ 24 ชั่วโมง (ช่อง <input type="time"> จะขึ้น AM/PM ตามภาษาเบราว์เซอร์) */
function TimeSelect({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue?: string | null;
  className: string;
}) {
  // ถ้าเวลาเดิมไม่อยู่ในรายการ (เช่น 18:15) ก็ยังแสดงให้เลือกได้
  const options = defaultValue && !TIMES.includes(defaultValue) ? [...TIMES, defaultValue].sort() : TIMES;

  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={className}>
      <option value="">--:--</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
