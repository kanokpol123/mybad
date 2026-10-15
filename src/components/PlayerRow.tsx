"use client";

import { useActionState, useState } from "react";
import { togglePlayerActive, updatePlayer, type FormState } from "@/actions/players";
import { AVATARS } from "@/lib/avatars";
import Avatar from "./Avatar";
import SubmitButton from "./SubmitButton";

type Props = { player: { id: number; name: string; avatar: string | null; active: boolean } };

/** แถวผู้เล่น 1 คน: กด ✏️ เพื่อแก้ชื่อ + เลือกตัวการ์ตูน */
export default function PlayerRow({ player }: Props) {
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState(player.avatar ?? "");
  const [state, formAction] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updatePlayer(prev, formData);
    if (!result.error) setEditing(false); // บันทึกสำเร็จ → ปิดโหมดแก้ไข
    return result;
  }, {});

  if (!editing) {
    return (
      <li className={`flex items-center gap-3 px-4 py-2.5 ${player.active ? "" : "opacity-50"}`}>
        <Avatar avatar={player.avatar} size={40} />
        <span className="flex-1 truncate">{player.name}</span>
        {player.active && (
          <button
            onClick={() => setEditing(true)}
            aria-label={`แก้ไข ${player.name}`}
            className="rounded-lg px-2 py-1 text-lg hover:bg-slate-100"
          >
            ✏️
          </button>
        )}
        {/* ฟอร์มเล็กๆ ที่มีแค่ปุ่มเดียว: ส่ง playerId ไปให้ Server Action */}
        <form action={togglePlayerActive}>
          <input type="hidden" name="playerId" value={player.id} />
          <SubmitButton variant="secondary" className="px-3 py-1 text-sm">
            {player.active ? "ซ่อน" : "เปิดใช้"}
          </SubmitButton>
        </form>
      </li>
    );
  }

  // ----- โหมดแก้ไข -----
  return (
    <li className="bg-slate-50 px-4 py-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="playerId" value={player.id} />
        <input type="hidden" name="avatar" value={avatar} />

        <div className="flex items-center gap-3">
          <Avatar avatar={avatar} size={48} />
          <input
            name="name"
            defaultValue={player.name}
            maxLength={30}
            required
            aria-label="ชื่อ"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-600">เลือกตัวการ์ตูน</p>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatar(a.id)}
                aria-label={`${a.gender === "boy" ? "ผู้ชาย" : "ผู้หญิง"} แบบ ${a.id.split("-")[1]}`}
                aria-pressed={avatar === a.id}
                className={`flex justify-center rounded-2xl border-2 p-1.5 ${
                  avatar === a.id ? "border-brand bg-brand/10" : "border-transparent"
                }`}
              >
                <Avatar avatar={a.id} size={52} />
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">แถวบน = ผู้ชาย • แถวล่าง = ผู้หญิง</p>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex gap-2">
          <SubmitButton className="flex-1">บันทึก</SubmitButton>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setAvatar(player.avatar ?? "");
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-600"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </li>
  );
}
