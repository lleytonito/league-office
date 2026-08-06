"use client";

import { Sigma } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type AveragePointsRow = {
  averagePoints: number;
  espnMemberId: string;
  latestTeamName: string;
  managerLabel: string;
  seasonsPlayed: number;
  totalPoints: number;
};

export function AveragePointsCard({
  currentEspnMemberId,
  hasWarnings,
  lastRefreshedAt,
  rows,
}: {
  currentEspnMemberId?: string | null;
  hasWarnings: boolean;
  lastRefreshedAt: string | null;
  rows: AveragePointsRow[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm" id="average-points">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sigma className="text-[#587246]" size={19} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Average Points Scored</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#626b59]">
            ESPN season points averaged across completed scored seasons.
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

      {rows.length ? (
        <>
          <div
            className={`mt-4 overflow-hidden transition-[max-height] duration-500 ease-out motion-reduce:transition-none ${
              expanded ? "max-h-[2400px]" : "max-h-[292px]"
            }`}
          >
            <div className="grid gap-2">
              {rows.map((row, index) => (
                <AveragePointsRowCard
                  currentEspnMemberId={currentEspnMemberId}
                  index={index}
                  key={row.espnMemberId}
                  row={row}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {rows.length > 3 ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e]"
                onClick={() => setExpanded((current) => !current)}
                type="button"
              >
                {expanded ? "Close" : "View full ranking"}
              </button>
            ) : null}
            <details className="group">
              <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#cfd8c4] bg-[#f7f8f4] px-4 text-sm font-semibold text-[#293421] transition hover:bg-[#eef2e8]">
                <span className="group-open:hidden">Formula</span>
                <span className="hidden group-open:inline">Hide formula</span>
              </summary>
              <div className="mt-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3">
                <div className="grid gap-2 rounded-[8px] bg-white p-3 text-sm text-[#293421]">
                  <span className="font-mono">AVG = TP / S</span>
                  <p className="text-sm leading-6 text-[#626b59]">
                    TP is total ESPN season points. S is completed scored seasons for a current active team.
                  </p>
                </div>
              </div>
            </details>
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
          Average points will appear after ESPN analytics are refreshed.
        </p>
      )}
    </section>
  );
}

function AveragePointsRowCard({
  currentEspnMemberId,
  index,
  row,
}: {
  currentEspnMemberId?: string | null;
  index: number;
  row: AveragePointsRow;
}) {
  const isCurrentTeam = row.espnMemberId === currentEspnMemberId;

  return (
    <Link href={`/teams/${encodeURIComponent(row.espnMemberId)}?from=analytics`}>
      <article
        className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[8px] border p-3 transition ${
          isCurrentTeam
            ? "border-[#b8872f] bg-[#fff9ea] shadow-[0_0_0_1px_rgba(184,135,47,0.18)]"
            : "border-[#e1e5d9] bg-[#fbfcf8] hover:border-[#c8d1be]"
        }`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#183a2b] text-sm font-semibold text-white">
          {index + 1}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#293421]">{row.managerLabel}</h3>
          <p className="text-sm text-[#626b59]">
            {row.latestTeamName} - {row.seasonsPlayed} scored season{row.seasonsPlayed === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6a725f]">
            {Math.round(row.totalPoints).toLocaleString()} total ESPN points
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-[#293421]">{row.averagePoints.toLocaleString()}</p>
          <p className="text-xs font-semibold text-[#6a725f]">AVG</p>
        </div>
      </article>
    </Link>
  );
}
