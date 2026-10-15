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
        <input type="time" name="startTime" defaultValue={defaults?.startTime ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>ถึง</span>
        <input type="time" name="endTime" defaultValue={defaults?.endTime ?? ""} className={inputClass} />
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
