import Link from "next/link";
import { teamName } from "@/lib/format";

type Props = {
  match: {
    id: number;
    number: number;
    scoreA: number;
    scoreB: number;
    status: "WAITING" | "PLAYING" | "FINISHED";
    players: { side: "A" | "B"; player: { name: string } }[];
  };
};

const STATUS = {
  WAITING: { text: "รอคิว", style: "bg-slate-100 text-slate-600" },
  PLAYING: { text: "กำลังตี", style: "bg-amber-100 text-amber-700" },
  FINISHED: { text: "จบแล้ว", style: "bg-emerald-100 text-emerald-700" },
};

/** การ์ดแสดง 1 เกม: ใครเจอใคร คะแนน — กดแล้วไปหน้านับแต้ม */
export default function MatchCard({ match }: Props) {
  const sideA = match.players.filter((p) => p.side === "A").map((p) => p.player);
  const sideB = match.players.filter((p) => p.side === "B").map((p) => p.player);
  const finished = match.status === "FINISHED";
  const aWon = finished && match.scoreA > match.scoreB;
  const bWon = finished && match.scoreB > match.scoreA;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-500">เกมที่ {match.number}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS[match.status].style}`}>
          {STATUS[match.status].text}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2">
        <span className={`truncate text-team-a ${aWon ? "font-bold" : ""}`}>
          {aWon && "👑 "}
          {teamName(sideA)}
        </span>
        <span className="text-xl font-bold tabular-nums">{match.scoreA}</span>
        <span className={`truncate text-team-b ${bWon ? "font-bold" : ""}`}>
          {bWon && "👑 "}
          {teamName(sideB)}
        </span>
        <span className="text-xl font-bold tabular-nums">{match.scoreB}</span>
      </div>

      {!finished && <p className="mt-3 text-center text-sm text-brand">แตะเพื่อนับแต้ม →</p>}
    </Link>
  );
}
