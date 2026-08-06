import type { AccoladeRecord } from "@/components/analytics/accolades-card";
import { Award, Flame, Medal, Shield, Sparkles, Trophy } from "lucide-react";

export type ChampionshipAccolade = {
  season: number;
  teamName: string;
};

export type RankingAccolade = {
  label: string;
  rank: number;
};

export function TeamAccolades({
  championships,
  championshipSeasons = [],
  rankingAccolades = [],
  records,
  veteranSeasons = 0,
}: {
  championships: number;
  championshipSeasons?: ChampionshipAccolade[];
  rankingAccolades?: RankingAccolade[];
  records: AccoladeRecord[];
  veteranSeasons?: number;
}) {
  const isVeteran = veteranSeasons >= 10;
  const hasAccolades = championships > 0 || isVeteran || rankingAccolades.length > 0 || records.length > 0;

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm" id="accolades">
      <div className="flex items-center gap-2">
        <Sparkles className="text-[#587246]" size={18} aria-hidden="true" />
        <h2 className="text-xl font-semibold">Accolades</h2>
      </div>

      {hasAccolades ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {championships > 0 ? (
            <article className="rounded-[9px] border border-[#e2c16d] bg-[#fff8df] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
                <Trophy className="text-[#b8872f]" size={15} aria-hidden="true" />
                League Champion
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#293421]">
                {championships}x Champion
              </p>
              {championshipSeasons.length ? (
                <p className="mt-1 text-sm leading-6 text-[#626b59]">
                  {championshipSeasons.map((champion) => `${champion.season} ${champion.teamName}`).join(", ")}
                </p>
              ) : null}
            </article>
          ) : null}

          {isVeteran ? (
            <article className="rounded-[9px] border border-[#c8d1be] bg-[#f1f7ec] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
                <Shield className="text-[#426b39]" size={15} aria-hidden="true" />
                Veteran
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#293421]">{veteranSeasons} seasons</p>
              <p className="mt-1 text-sm leading-6 text-[#626b59]">10+ seasons played</p>
            </article>
          ) : null}

          {rankingAccolades.map((accolade) => (
            <article className="rounded-[9px] border border-[#b9d6e6] bg-[#eef8fc] p-3" key={accolade.label}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
                <Award className="text-[#2f6f8f]" size={15} aria-hidden="true" />
                Top 3
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#293421]">#{accolade.rank}</p>
              <p className="mt-1 text-sm leading-6 text-[#626b59]">{accolade.label}</p>
            </article>
          ))}

          {records.map((record) => (
            <article className={`rounded-[9px] border p-3 ${teamAccoladeClass(record.accent)}`} key={record.id}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
                {teamAccoladeIcon(record.id)}
                {record.title}
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#293421]">{record.valueLabel}</p>
              <p className="mt-1 text-sm leading-6 text-[#626b59]">
                {record.scoreLine ? `${record.scoreLine} - ` : ""}
                {record.matchupLabel}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
          No active record accolades yet.
        </p>
      )}
    </section>
  );
}

function teamAccoladeIcon(id: AccoladeRecord["id"]) {
  if (id === "biggest-blowout") {
    return <Flame className="text-[#a94124]" size={15} aria-hidden="true" />;
  }

  if (id === "playoff-run") {
    return <Shield className="text-[#426b39]" size={15} aria-hidden="true" />;
  }

  return <Medal className="text-[#2f6f8f]" size={15} aria-hidden="true" />;
}

function teamAccoladeClass(accent: AccoladeRecord["accent"]) {
  if (accent === "red") {
    return "border-[#efc3b4] bg-[#fff2ec]";
  }

  if (accent === "blue") {
    return "border-[#b9d6e6] bg-[#eef8fc]";
  }

  if (accent === "green") {
    return "border-[#c9dabc] bg-[#f1f7ec]";
  }

  return "border-[#d9c0a2] bg-[#fff5eb]";
}
