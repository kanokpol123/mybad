import type { PlayerStat } from "@/lib/stats";

const MEDALS = ["🥇", "🥈", "🥉"];

/** ตารางอันดับผู้เล่น */
export default function StatsTable({ stats }: { stats: PlayerStat[] }) {
  if (stats.length === 0) {
    return <p className="py-6 text-center text-slate-500">ยังไม่มีเกมที่จบ</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">ผู้เล่น</th>
            <th className="px-2 py-2 font-medium">เล่น</th>
            <th className="px-2 py-2 font-medium">ชนะ</th>
            <th className="px-2 py-2 font-medium">แพ้</th>
            <th className="px-2 py-2 font-medium">%ชนะ</th>
            <th className="px-3 py-2 font-medium">+/-</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-center tabular-nums">
          {stats.map((s, i) => (
            <tr key={s.playerId}>
              <td className="px-3 py-2.5 text-left">
                <span className="mr-1 inline-block w-6">{MEDALS[i] ?? `${i + 1}.`}</span>
                {s.name}
              </td>
              <td className="px-2">{s.played}</td>
              <td className="px-2 font-semibold text-emerald-600">{s.wins}</td>
              <td className="px-2 text-slate-400">{s.losses}</td>
              <td className="px-2">{s.winRate}%</td>
              <td className={`px-3 ${s.pointDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
