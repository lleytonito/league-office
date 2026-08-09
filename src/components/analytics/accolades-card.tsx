"use client";

import { ArrowRight, Flame, Medal, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export type AccoladeRecord = {
  accent: "blue" | "bronze" | "gold" | "green" | "red" | "violet";
  espnMemberId: string;
  gameScores?: Array<{
    label: string;
    scoreLabel: string;
    week: number;
  }>;
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
        <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-3">
          {records.map((record) => (
            <Link
              className="group min-w-0"
              href={`/teams/${encodeURIComponent(record.espnMemberId)}?from=analytics#accolades`}
              key={record.id}
            >
              <AccoladeRecordCard record={record} />
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

function AccoladeRecordCard({ record }: { record: AccoladeRecord }) {
  if (record.id === "biggest-blowout") {
    return <BiggestBlowoutRecord record={record} />;
  }

  if (record.id === "playoff-run") {
    return <PlayoffRunRecord record={record} />;
  }

  return <MostPointsGameRecord record={record} />;
}

function BiggestBlowoutRecord({ record }: { record: AccoladeRecord }) {
  const [holderScore = "", opponentScore = ""] = (record.scoreLine ?? "").split("-").map((score) => score.trim());
  const stackNames = Math.max(record.holderLabel.length, record.opponentLabel?.length ?? 0) > 13;

  return (
    <article className="relative grid h-full min-h-[286px] overflow-hidden rounded-[10px] border border-[#ddb9a6] bg-[#eef0e7] p-4 text-[#3e201b] shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-[#c7924b]">
      <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-[#c7924b]/75" />
      <div className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-[#c7924b]/40" />

      <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a4638]">Accolade</p>
            <h3 className="mt-1 text-xl font-semibold leading-none text-[#3e201b]">{record.title}</h3>
          </div>
          <Flame className="shrink-0 text-[#a94124]" size={21} strokeWidth={2.2} aria-hidden="true" />
        </div>

        <div className="relative flex items-center pb-5">
          <div className="grid w-full grid-cols-2 overflow-hidden rounded-[9px] border border-[#c7924b] bg-[#3e201b] shadow-[inset_0_1px_0_rgba(245,232,215,0.08)]">
            <div className="min-w-0 border-r border-[#c7924b]/55 bg-[#8a4638] px-3 py-3.5">
              <p className={`flex min-h-12 items-end font-semibold leading-tight text-[#f3c56d] ${scoreboardNameClass(record.holderLabel)}`}>
                {formatScoreboardName(record.holderLabel, stackNames)}
              </p>
              <p className="mt-2 text-[2.45rem] font-semibold leading-none text-[#f5e8d7]">{holderScore || "N/A"}</p>
            </div>
            <div className="min-w-0 bg-[#3e201b] px-3 py-3.5 text-right">
              <p className={`flex min-h-12 items-end justify-end font-semibold leading-tight text-[#d8b9a7] ${scoreboardNameClass(record.opponentLabel ?? "Opponent")}`}>
                {formatScoreboardName(record.opponentLabel ?? "Opponent", stackNames)}
              </p>
              <p className="mt-2 text-[2.45rem] font-semibold leading-none text-[#d8b9a7]">{opponentScore || "N/A"}</p>
            </div>
          </div>
          <div className="absolute left-1/2 top-[42%] z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#c7924b] bg-[#4a251f] text-[10px] font-semibold text-[#c7924b] shadow-sm">
            VS
          </div>
          <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#9b6c35] bg-[#c7924b] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#3e201b] shadow-sm">
            {formatMarginLabel(record.valueLabel)}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a4638]">Record holder</p>
            <p className={`mt-0.5 font-semibold leading-tight text-[#b0863f] ${recordHolderClass(record.holderLabel)}`}>{record.holderLabel}</p>
          </div>
          <p className="shrink-0 text-right text-xs font-semibold leading-tight text-[#8a4638]">{record.matchupLabel}</p>
        </div>
      </div>
    </article>
  );
}

function MostPointsGameRecord({ record }: { record: AccoladeRecord }) {
  const points = record.valueLabel.replace(/\s*pts?$/i, "");

  return (
    <article className="relative grid h-full min-h-[286px] overflow-hidden rounded-[10px] border border-[#bfa66a]/70 bg-[#eef0e7] p-4 text-[#14232b] shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-[#456a7f]">
      <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-[#bfa66a]/70" />
      <div className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-[#bfa66a]/45" />

      <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#456a7f]">Accolade</p>
            <h3 className="mt-1 text-xl font-semibold leading-none text-[#14232b]">{record.title}</h3>
          </div>
          <Medal className="shrink-0 text-[#2f6f8f]" size={21} strokeWidth={2.2} aria-hidden="true" />
        </div>

        <div className="relative flex items-center justify-center py-1 text-center">
          <div className="pointer-events-none absolute left-0 top-1/2 h-px w-[23%] bg-[#bfa66a]/75" />
          <div className="pointer-events-none absolute right-0 top-1/2 h-px w-[23%] bg-[#bfa66a]/75" />
          <div>
            <p className="text-[5.1rem] font-semibold leading-[0.82] text-[#1e313a] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
              {points}
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b0863f]">Points</p>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#456a7f]">Record holder</p>
            <p className={`mt-0.5 font-semibold leading-tight text-[#b0863f] ${recordHolderClass(record.holderLabel)}`}>{record.holderLabel}</p>
          </div>
          <div className="min-w-[7rem] text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#456a7f]">Game</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-[#14232b]">{record.scoreLine ?? "N/A"}</p>
            <p className="text-[11px] font-semibold leading-tight text-[#6f776b]">{record.matchupLabel}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function PlayoffRunRecord({ record }: { record: AccoladeRecord }) {
  const total = record.valueLabel.replace(/\s*pts?$/i, "");
  const rounds = record.gameScores?.length ? record.gameScores : [{ label: "Run", scoreLabel: record.scoreLine ?? "N/A", week: 0 }];

  return (
    <article className="relative grid h-full min-h-[286px] overflow-hidden rounded-[10px] border border-[#bfa66a]/70 bg-[#eef0e7] p-4 text-[#17151c] shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-[#59456f]">
      <div className="pointer-events-none absolute inset-y-4 left-1/2 w-px bg-[#bfa66a]/35 max-sm:hidden" />
      <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-[#bfa66a]/65" />
      <div className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-[#bfa66a]/35" />

      <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#59456f]">Accolade</p>
            <h3 className="mt-1 text-xl font-semibold leading-none text-[#59456f]">{record.title}</h3>
          </div>
          <p className="shrink-0 pt-1 text-xs font-semibold text-[#59456f]">{record.season}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-center gap-3">
          <div className="min-w-0">
            <p className="text-[3.8rem] font-semibold leading-[0.86] text-[#59456f] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
              {total}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#59456f]">
              Total points
            </p>
          </div>

          <div className="relative min-w-0">
            <div className="relative grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1">
              {rounds.slice(0, 3).map((round, index, visibleRounds) => (
                <Fragment key={`${round.label}-${round.week}`}>
                  <div className="min-w-0 text-center">
                    <div className="mb-1 flex h-4 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#59456f]">
                      {index === visibleRounds.length - 1 ? (
                        <Trophy size={13} strokeWidth={2.2} aria-label="Final" />
                      ) : (
                        roundLabel(round.label)
                      )}
                    </div>
                    <div
                      className={`mx-auto flex items-center justify-center border border-[#bfa66a] bg-[#2b2236] font-semibold text-[#d9c16d] shadow-sm ${
                        index === visibleRounds.length - 1
                          ? "h-12 w-14 rounded-[12px] border-2 text-base"
                          : "h-11 w-11 rounded-full text-sm"
                      }`}
                    >
                      {round.scoreLabel}
                    </div>
                  </div>
                  {index < visibleRounds.length - 1 ? (
                    <ArrowRight className="mt-5 text-[#bfa66a]" size={14} strokeWidth={2.4} aria-hidden="true" />
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#59456f]">Record holder</p>
          <p className={`mt-0.5 font-semibold leading-tight text-[#b0863f] ${recordHolderClass(record.holderLabel)}`}>{record.holderLabel}</p>
        </div>
      </div>
    </article>
  );
}

function scoreboardNameClass(value: string) {
  if (value.length > 22) {
    return "text-[0.72rem]";
  }

  if (value.length > 18) {
    return "text-xs";
  }

  if (value.length > 14) {
    return "text-sm";
  }

  return "text-base";
}

function recordHolderClass(name: string) {
  if (name.length > 24) {
    return "text-[0.82rem]";
  }

  if (name.length > 18) {
    return "text-[0.9rem]";
  }

  return "text-base";
}

function formatScoreboardName(name: string, shouldStack: boolean) {
  if (!shouldStack || !name.includes(" ")) {
    return name;
  }

  const parts = name.split(" ");
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")}
      <br />
      {last}
    </>
  );
}

function formatMarginLabel(label: string) {
  const normalized = label.replace(" pt margin", " margin");
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function roundLabel(label: string) {
  return label === "R1" ? "QF" : label;
}
