"use client";

// ===============================================================
//  กระดานนับแต้ม (หน้าที่ใช้บ่อยที่สุดตอนตีจริง)
// ---------------------------------------------------------------
//  - แตะครึ่งจอของทีมไหน = ทีมนั้นได้ 1 แต้ม
//  - ทุกครั้งที่กด จะบันทึกลงฐานข้อมูลทันที (คะแนนไม่หายแน่นอน)
//  - มีปุ่มย้อนกลับเผื่อกดผิด
// ===============================================================

import { useState, useTransition } from "react";
import { finishMatch, reopenMatch, saveScore } from "@/actions/matches";
import { gameStatusText, getWinner, serviceCourt, type TeamSide } from "@/lib/scoring";
import Avatar from "./Avatar";

type TeamPlayer = { name: string; avatar: string | null };
type Score = { a: number; b: number; serving: TeamSide | null };

type Props = {
  matchId: number;
  pointsToWin: number;
  initial: Score;
  finished: boolean;
  teamA: TeamPlayer[];
  teamB: TeamPlayer[];
};

export default function Scoreboard({ matchId, pointsToWin, initial, finished, teamA, teamB }: Props) {
  const teamANames = teamA.map((p) => p.name);
  const teamBNames = teamB.map((p) => p.name);
  const [score, setScore] = useState<Score>(initial);
  const [history, setHistory] = useState<Score[]>([]); // คะแนนก่อนหน้า ใช้ย้อนกลับ
  const [error, setError] = useState<string>();
  const [isSaving, startSaving] = useTransition();

  const winner = getWinner(score.a, score.b, pointsToWin);
  const statusText = gameStatusText(score.a, score.b, pointsToWin);

  /** เปลี่ยนคะแนนบนจอทันที แล้วค่อยส่งไปบันทึกที่ server */
  function update(next: Score, pushHistory = true) {
    if (pushHistory) setHistory((h) => [...h, score]);
    setScore(next);
    setError(undefined);
    startSaving(async () => {
      try {
        await saveScore(matchId, next.a, next.b, next.serving);
      } catch {
        setError("บันทึกไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วกดแต้มต่อได้เลย ระบบจะบันทึกค่าล่าสุดให้");
      }
    });
  }

  function addPoint(team: TeamSide) {
    if (winner || finished) return; // จบเกมแล้ว กดไม่ได้
    update({
      a: team === "A" ? score.a + 1 : score.a,
      b: team === "B" ? score.b + 1 : score.b,
      serving: team, // ทีมที่ได้แต้ม = ทีมที่ได้เสิร์ฟลูกต่อไป
    });
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    update(previous, false);
  }

  // ----- เกมจบและบันทึกผลไปแล้ว -----
  if (finished) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-slate-500">ผลการแข่งขัน</p>
          <p className="my-3 text-5xl font-bold tabular-nums">
            <span className="text-team-a">{score.a}</span>
            <span className="mx-3 text-slate-300">-</span>
            <span className="text-team-b">{score.b}</span>
          </p>
          <p className="text-lg font-semibold">
            👑 {(score.a > score.b ? teamANames : teamBNames).join(" & ")} ชนะ!
          </p>
        </div>
        <button
          onClick={() => startSaving(() => reopenMatch(matchId))}
          disabled={isSaving}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 text-slate-600 disabled:opacity-50"
        >
          ✏️ แก้ไขคะแนน
        </button>
      </div>
    );
  }

  // ----- กำลังนับแต้ม -----
  return (
    <div className="space-y-3">
      <TeamPanel
        side="A"
        players={teamA}
        score={score.a}
        serving={score.serving === "A"}
        won={winner === "A"}
        onTap={() => addPoint("A")}
      />
      <TeamPanel
        side="B"
        players={teamB}
        score={score.b}
        serving={score.serving === "B"}
        won={winner === "B"}
        onTap={() => addPoint("B")}
      />

      <div className="flex min-h-6 items-center justify-between text-sm">
        <span className="font-medium text-amber-600">{statusText}</span>
        <span className="text-slate-400">{isSaving ? "กำลังบันทึก..." : "บันทึกแล้ว ✓"}</span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {winner ? (
        <button
          onClick={() => startSaving(() => finishMatch(matchId))}
          disabled={isSaving}
          className="w-full rounded-xl bg-brand py-4 text-lg font-bold text-white disabled:opacity-50"
        >
          ✅ จบเกม บันทึกผล
        </button>
      ) : (
        <p className="text-center text-sm text-slate-400">
          แตะที่ฝั่งทีมที่ได้แต้ม • ตีถึง {pointsToWin} แต้ม
        </p>
      )}

      <button
        onClick={undo}
        disabled={history.length === 0}
        className="w-full rounded-xl border border-slate-300 bg-white py-3 text-slate-600 disabled:opacity-40"
      >
        ↩️ ย้อนกลับ 1 แต้ม
      </button>
    </div>
  );
}

/** ครึ่งจอของ 1 ทีม (ทั้งกล่องเป็นปุ่มกดเพิ่มแต้ม) */
function TeamPanel(props: {
  side: TeamSide;
  players: TeamPlayer[];
  score: number;
  serving: boolean;
  won: boolean;
  onTap: () => void;
}) {
  const color = props.side === "A" ? "bg-team-a" : "bg-team-b";

  return (
    <button
      onClick={props.onTap}
      className={`${color} relative flex h-48 w-full flex-col items-center justify-center rounded-3xl text-white shadow-md transition select-none active:scale-[0.98] active:brightness-110`}
    >
      <span className="flex items-center gap-2 text-lg font-medium">
        <span className="flex -space-x-2">
          {props.players.map((p) => (
            <span key={p.name} className="rounded-full ring-2 ring-white/70">
              <Avatar avatar={p.avatar} size={32} />
            </span>
          ))}
        </span>
        {props.won && "👑 "}
        {props.players.map((p) => p.name).join(" & ")}
      </span>
      <span className="text-7xl font-bold tabular-nums">{props.score}</span>
      {props.serving && (
        <span className="absolute top-3 right-4 rounded-full bg-white/25 px-3 py-1 text-xs">
          🏸 เสิร์ฟ • ฝั่ง{serviceCourt(props.score)}
        </span>
      )}
    </button>
  );
}
