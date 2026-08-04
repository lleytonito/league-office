import type { TeamEraSummary } from "@/lib/espn/analytics";
import { HeartHandshake, Medal, Trophy } from "lucide-react";

export function TeamEraCard({ summary }: { summary: TeamEraSummary }) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Medal className="text-[#587246]" size={18} aria-hidden="true" />
        <h2 className="text-xl font-semibold">Team era</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <EraStat label="Best season" value={seasonLabel(summary.bestSeason)} />
        <EraStat label="Worst season" value={seasonLabel(summary.worstSeason)} />
        <EraStat label="Average finish" value={summary.averageFinish ? `#${summary.averageFinish}` : "N/A"} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
            <Trophy className="text-[#b8872f]" size={15} aria-hidden="true" />
            Championship W/L
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#293421]">
            {summary.championships}-{summary.runnerUps}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">
            {summary.seasonsPlayed} season{summary.seasonsPlayed === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
            <HeartHandshake className="text-[#587246]" size={15} aria-hidden="true" />
            Favorite opponent
          </div>
          {summary.favoriteOpponent ? (
            <>
              <p className="mt-2 truncate text-lg font-semibold text-[#293421]">
                {summary.favoriteOpponent.managerLabel}
              </p>
              <p className="text-sm text-[#626b59]">
                {summary.favoriteOpponent.wins}-{summary.favoriteOpponent.losses}
                {summary.favoriteOpponent.ties ? `-${summary.favoriteOpponent.ties}` : ""} -{" "}
                {summary.favoriteOpponent.winPercentage}% win rate
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#626b59]">
              No active-opponent matchup edge found yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function EraStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#f7f8f4] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-[#293421]">{value}</p>
    </div>
  );
}

function seasonLabel(season: TeamEraSummary["bestSeason"]) {
  return season ? `${season.season} - #${season.finalRank}` : "N/A";
}
