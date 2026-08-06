"use client";

import { Flame, Medal, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

export type AccoladeRecord = {
  accent: "blue" | "bronze" | "gold" | "green" | "red";
  espnMemberId: string;
  holderLabel: string;
  id: "biggest-blowout" | "most-points-game" | "playoff-run";
  matchupLabel: string;
  opponentLabel: string | null;
  scoreLine: string | null;
  season: number;
  teamName: string;
  title: string;
  value: number;
  valueLabel: string;
};

export function AccoladesCard({
  records,
}: {
  records: AccoladeRecord[];
}) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm" id="accolades">
      <div className="flex items-center gap-2">
        <Sparkles className="text-[#b8872f]" size={19} aria-hidden="true" />
        <h2 className="text-xl font-semibold">Accolades</h2>
      </div>
      <p className="mt-1 text-sm leading-6 text-[#626b59]">
        Active-team record holders from imported ESPN history.
      </p>

      {records.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {records.map((record) => (
            <Link
              className="group min-w-0"
              href={`/teams/${encodeURIComponent(record.espnMemberId)}?from=analytics#accolades`}
              key={record.id}
            >
              <article
                className={`grid h-full gap-3 rounded-[10px] border p-4 transition group-hover:-translate-y-0.5 ${accentClass(
                  record.accent,
                )}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
                    {recordIcon(record.id)}
                  </div>
                  <p className="text-right text-2xl font-semibold text-[#293421]">{record.valueLabel}</p>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#293421]">{record.title}</h3>
                  <p className="mt-1 truncate text-sm font-semibold text-[#293421]">{record.holderLabel}</p>
                  <p className="truncate text-sm text-[#626b59]">{record.teamName}</p>
                </div>
                <div className="rounded-[8px] bg-white/70 p-3 text-sm leading-6 text-[#3e4a36]">
                  {record.scoreLine ? <p className="font-semibold text-[#293421]">{record.scoreLine}</p> : null}
                  {record.opponentLabel ? <p>vs. {record.opponentLabel}</p> : null}
                  <p>{record.matchupLabel}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
          Accolades will appear after ESPN analytics are refreshed.
        </p>
      )}
    </section>
  );
}

function recordIcon(id: AccoladeRecord["id"]) {
  if (id === "biggest-blowout") {
    return <Flame className="text-[#a94124]" size={20} aria-hidden="true" />;
  }

  if (id === "playoff-run") {
    return <Shield className="text-[#426b39]" size={20} aria-hidden="true" />;
  }

  return <Medal className="text-[#2f6f8f]" size={20} aria-hidden="true" />;
}

function accentClass(accent: AccoladeRecord["accent"]) {
  if (accent === "red") {
    return "border-[#efc3b4] bg-[#fff2ec] shadow-sm hover:border-[#e3a18b]";
  }

  if (accent === "blue") {
    return "border-[#b9d6e6] bg-[#eef8fc] shadow-sm hover:border-[#8ebcd2]";
  }

  if (accent === "green") {
    return "border-[#c9dabc] bg-[#f1f7ec] shadow-sm hover:border-[#a9c79a]";
  }

  return "border-[#d9c0a2] bg-[#fff5eb] shadow-sm hover:border-[#c49b6e]";
}
