import { Trophy } from "lucide-react";

export type SeasonFinish = {
  espn_team_id: number;
  final_rank: number | null;
  season: number;
  team_name: string;
};

export function SeasonFinishes({ teams }: { teams: SeasonFinish[] }) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Trophy className="text-[#b8872f]" size={18} aria-hidden="true" />
        <h2 className="text-xl font-semibold">Season finishes</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {teams.map((team) => (
          <p
            className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-sm ${finishRowClass(team.final_rank)}`}
            key={`${team.season}-${team.espn_team_id}`}
          >
            <span className="font-semibold text-[#293421]">{team.season}</span>
            <span className="min-w-0 flex-1 truncate text-[#626b59]">{team.team_name}</span>
            <span className="font-semibold text-[#3e4a36]">
              {team.final_rank ? `#${team.final_rank}` : "TBD"}
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}

function finishRowClass(rank: number | null) {
  if (rank === 1) {
    return "border-[#d2a33a] bg-[#fff8e4] text-[#6f4d10]";
  }

  if (rank === 2) {
    return "border-[#bcc3ca] bg-[#f4f6f7] text-[#4b5560]";
  }

  if (rank === 3) {
    return "border-[#c58c5c] bg-[#fff1e7] text-[#70411f]";
  }

  return "border-[#e1e5d9] bg-[#fbfcf8]";
}
