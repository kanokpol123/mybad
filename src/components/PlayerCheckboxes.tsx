import Avatar from "./Avatar";

/**
 * รายชื่อผู้เล่นให้ติ๊กเลือก (แสดงเป็นปุ่มกลมๆ กดง่ายบนมือถือ)
 * ค่าที่เลือกจะถูกส่งไปกับฟอร์มในชื่อ "playerIds"
 */
export default function PlayerCheckboxes({
  players,
  selectedIds = [],
}: {
  players: { id: number; name: string; avatar: string | null }[];
  selectedIds?: number[];
}) {
  if (players.length === 0) {
    return <p className="text-sm text-slate-500">ยังไม่มีผู้เล่น ไปเพิ่มที่เมนู “ผู้เล่น” ก่อนนะ</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => (
        <label key={p.id} className="cursor-pointer">
          {/* sr-only = ซ่อน checkbox จริง แล้วใช้ peer-checked: เปลี่ยนสีป้ายแทน */}
          <input
            type="checkbox"
            name="playerIds"
            value={p.id}
            defaultChecked={selectedIds.includes(p.id)}
            className="peer sr-only"
          />
          <span className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white py-1 pr-4 pl-1 text-sm peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
            <Avatar avatar={p.avatar} size={26} />
            {p.name}
          </span>
        </label>
      ))}
    </div>
  );
}
