"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";

export type AllTimeRankingRow = {
  championships: number;
  latestTeamName: string;
  managerLabel: string;
  placementPoints: number;
  powerScore: number;
  runnerUps: number;
  seasonsPlayed: number;
  totalPoints: number;
};

const powerFormula = {
  baselineAverage: 6.5,
  priorSeasons: 2,
};

export function AllTimeRankingsCard({
  completedSeasons,
  hasWarnings,
  lastRefreshedAt,
  rankings,
}: {
  completedSeasons: number[];
  hasWarnings: boolean;
  lastRefreshedAt: string | null;
  rankings: AllTimeRankingRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRankings = expanded ? rankings : rankings.slice(0, 3);

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">All-Time Rankings</h2>
          <p className="mt-1 text-sm leading-6 text-[#626b59]">
            Power score blends placement points, championship results, and seasons played.
          </p>
        </div>
        {lastRefreshedAt ? (
          <span className="rounded-full bg-[#e9eee0] px-3 py-1 text-xs font-semibold text-[#3e4a36]">
            Refreshed {new Date(lastRefreshedAt).toLocaleDateString()}
          </span>
        ) : null}
      </div>

      {hasWarnings ? (
        <p className="mt-3 rounded-[8px] bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Some historical seasons were unavailable, so this is based on the latest successful refresh.
        </p>
      ) : null}

      {rankings.length ? (
        <>
          <div className="mt-4 grid gap-2">
            {visibleRankings.map((row, index) => (
              <RankingRow index={index} key={`${row.latestTeamName}-${index}`} row={row} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {rankings.length > 3 ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e]"
                onClick={() => setExpanded((current) => !current)}
                type="button"
              >
                {expanded ? "Close" : "View full rankings"}
              </button>
            ) : null}
            <details className="group">
              <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#cfd8c4] bg-[#f7f8f4] px-4 text-sm font-semibold text-[#293421] transition hover:bg-[#eef2e8]">
                <span className="group-open:hidden">Formula</span>
                <span className="hidden group-open:inline">Hide formula</span>
              </summary>
              <FormulaDetails />
            </details>
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
          No analytics have been refreshed yet.
        </p>
      )}

      {completedSeasons.length ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">
          Seasons: {completedSeasons.join(", ")}
        </p>
      ) : null}
    </section>
  );
}

function FormulaDetails() {
  return (
    <div className="mt-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3 text-sm leading-6 text-[#626b59]">
      <div className="grid gap-3 rounded-[8px] bg-white p-3 text-[#293421]">
        <div className="grid gap-1 font-mono text-sm">
          <span>PWR = (TP + B &times; K) / (S + K)</span>
          <span>
            TP = &Sigma;(L<sub>s</sub> - R<sub>s</sub> + 1) + 3C + RU
          </span>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5 text-[#626b59]">
          <dt className="font-mono font-semibold text-[#293421]">TP</dt>
          <dd>Total points</dd>
          <dt className="font-mono font-semibold text-[#293421]">Ls</dt>
          <dd>League size in season s</dd>
          <dt className="font-mono font-semibold text-[#293421]">Rs</dt>
          <dd>Final ESPN rank in season s</dd>
          <dt className="font-mono font-semibold text-[#293421]">C</dt>
          <dd>Championships</dd>
          <dt className="font-mono font-semibold text-[#293421]">RU</dt>
          <dd>Runner-up finishes</dd>
          <dt className="font-mono font-semibold text-[#293421]">S</dt>
          <dd>Seasons played</dd>
          <dt className="font-mono font-semibold text-[#293421]">B</dt>
          <dd>Baseline average ({powerFormula.baselineAverage})</dd>
          <dt className="font-mono font-semibold text-[#293421]">K</dt>
          <dd>Baseline seasons ({powerFormula.priorSeasons})</dd>
        </dl>
      </div>
    </div>
  );
}

function RankingRow({ index, row }: { index: number; row: AllTimeRankingRow }) {
  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#183a2b] text-sm font-semibold text-white">
        {index + 1}
      </span>
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-[#293421]">{row.managerLabel}</h3>
        <p className="text-sm text-[#626b59]">
          {row.latestTeamName} - {row.seasonsPlayed} seasons - {row.totalPoints} total pts
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#7a5638]">
          <Trophy size={13} aria-hidden="true" />
          Champ W/L {row.championships}-{row.runnerUps}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-[#293421]">{row.powerScore}</p>
        <p className="text-xs font-semibold text-[#6a725f]">PWR</p>
      </div>
    </article>
  );
}
