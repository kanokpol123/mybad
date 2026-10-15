import { findAvatar } from "@/lib/avatars";

/**
 * รูปการ์ตูนของผู้เล่น (วาดด้วย SVG ไม่ต้องโหลดรูป)
 * ถ้ายังไม่ได้เลือก จะแสดงหน้าตาสีเทาแทน
 */
export default function Avatar({ avatar, size = 40 }: { avatar: string | null | undefined; size?: number }) {
  const preset = findAvatar(avatar);
  const hair = preset?.hair ?? "#94a3b8";
  const shirt = preset?.shirt ?? "#cbd5e1";
  const bg = preset?.bg ?? "#f1f5f9";
  const isGirl = preset?.gender === "girl";

  return (
    // rounded-full + overflow-hidden = ตัดขอบให้เป็นวงกลม
    <svg viewBox="0 0 64 64" width={size} height={size} className="shrink-0 overflow-hidden rounded-full" aria-hidden>
      <rect width="64" height="64" fill={bg} />
      <g>
        {/* ผมยาวด้านหลัง (ผู้หญิง) */}
        {isGirl && <path d="M13 30 Q12 52 20 56 L44 56 Q52 52 51 30 Z" fill={hair} />}
        {/* ตัว + เสื้อ */}
        <path d="M12 64 Q12 46 32 46 Q52 46 52 64 Z" fill={shirt} />
        <path d="M27 46 L32 52 L37 46 Z" fill="#fff" opacity=".7" />
        {/* คอ + หัว */}
        <rect x="28" y="40" width="8" height="7" rx="3" fill="#f2c4a0" />
        <circle cx="32" cy="29" r="15" fill="#ffdcc0" />
        {/* ผมด้านบน */}
        {isGirl ? (
          <path d="M17 29 Q16 13 32 13 Q48 13 47 29 Q42 20 32 21 Q24 21 20 25 Z" fill={hair} />
        ) : (
          <path d="M17 28 Q16 12 32 13 Q48 12 47 28 Q44 22 38 21 Q36 24 30 23 Q22 22 17 28 Z" fill={hair} />
        )}
        {/* โบว์ (ผู้หญิง) */}
        {isGirl && (
          <g fill={shirt}>
            <path d="M43 16 L50 12 L50 21 Z" />
            <path d="M43 16 L37 11 L37 20 Z" />
            <circle cx="43" cy="16" r="2.4" />
          </g>
        )}
        {/* ตา แก้ม ปาก */}
        <circle cx="26.5" cy="30" r="2" fill="#1f2937" />
        <circle cx="37.5" cy="30" r="2" fill="#1f2937" />
        <circle cx="27.2" cy="29.3" r=".7" fill="#fff" />
        <circle cx="38.2" cy="29.3" r=".7" fill="#fff" />
        <ellipse cx="23" cy="35" rx="2.6" ry="1.6" fill="#fda4af" opacity=".8" />
        <ellipse cx="41" cy="35" rx="2.6" ry="1.6" fill="#fda4af" opacity=".8" />
        <path d="M29 35.5 Q32 38.5 35 35.5" stroke="#9f1239" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** ตัวการ์ตูนหลายคนเรียงซ้อนกัน (ใช้แสดงคู่หู) */
export function AvatarGroup({ players, size = 28 }: { players: { avatar: string | null }[]; size?: number }) {
  return (
    <span className="flex shrink-0 -space-x-2">
      {players.map((p, i) => (
        <span key={i} className="rounded-full ring-2 ring-white">
          <Avatar avatar={p.avatar} size={size} />
        </span>
      ))}
    </span>
  );
}
