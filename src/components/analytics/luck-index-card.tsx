import { Clover, TrendingDown, TrendingUp } from "lucide-react";

export type LuckIndexRow = {
  averageActualRank: number | null;
  averageExpectedRank: number | null;
  espnMemberId: string;
  latestTeamName: string;
  luckScore: number;
  managerLabel: string;
  seasonsPlayed: number;
  totalLuck: number;
};

export function LuckIndexCard({
  hasWarnings,
  lastRefreshedAt,
  rows,
}: {
  hasWarnings: boolean;
  lastRefreshedAt: string | null;
  rows: LuckIndexRow[];
}) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Clover className="text-[#587246]" size={19} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Luck Index</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#626b59]">
            Points-for rank compared to final finish, rolled up for current teams.
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
        <div className="mt-4 grid gap-2">
          {rows.map((row, index) => (
            <LuckRow index={index} key={row.espnMemberId} row={row} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
          Luck Index will appear after ESPN analytics are refreshed.
        </p>
      )}

      <details className="group mt-4">
        <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#cfd8c4] bg-[#f7f8f4] px-4 text-sm font-semibold text-[#293421] transition hover:bg-[#eef2e8]">
          <span className="group-open:hidden">Formula</span>
          <span className="hidden group-open:inline">Hide formula</span>
        </summary>
        <div className="mt-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3 text-sm leading-6 text-[#626b59]">
          <div className="grid gap-2 rounded-[8px] bg-white p-3 text-[#293421]">
            <p className="font-mono text-sm">Luck = expected rank - final rank</p>
            <p className="text-sm leading-6 text-[#626b59]">
              Expected rank is the team&apos;s points-for rank in that season. Positive scores mean a
              team finished better than its scoring rank; negative scores mean the finish lagged behind
              its scoring rank.
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}

function LuckRow({ index, row }: { index: number; row: LuckIndexRow }) {
  const tone = luckTone(row.luckScore);

  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${tone.badge}`}>
        {index + 1}
      </span>
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-[#293421]">{row.managerLabel}</h3>
        <p className="text-sm text-[#626b59]">
          {row.latestTeamName} - {row.seasonsPlayed || "No"} scored season{row.seasonsPlayed === 1 ? "" : "s"}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#6a725f]">
          {tone.icon}
          Expected #{formatRank(row.averageExpectedRank)} - Finished #{formatRank(row.averageActualRank)}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-semibold ${tone.text}`}>{signedNumber(row.luckScore)}</p>
        <p className="text-xs font-semibold text-[#6a725f]">{tone.label}</p>
      </div>
    </article>
  );
}

function luckTone(score: number) {
  if (score > 0) {
    return {
      badge: "bg-[#edf4e6] text-[#315b22]",
      icon: <TrendingUp size={13} aria-hidden="true" />,
      label: "Blessed",
      text: "text-[#315b22]",
    };
  }

  if (score < 0) {
    return {
      badge: "bg-[#fff1e7] text-[#70411f]",
      icon: <TrendingDown size={13} aria-hidden="true" />,
      label: "Cursed",
      text: "text-[#70411f]",
    };
  }

  return {
    badge: "bg-[#e9eee0] text-[#3e4a36]",
    icon: <Clover size={13} aria-hidden="true" />,
    label: "Even",
    text: "text-[#293421]",
  };
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatRank(value: number | null) {
  return value === null ? "N/A" : value;
}
