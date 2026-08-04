import { BarChart3, UsersRound } from "lucide-react";
import Link from "next/link";

export function LeagueHistoryPanel({
  ownerDisplayName,
  teamName,
}: {
  ownerDisplayName: string | null;
  teamName: string;
}) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-[#eef2e8] p-3 shadow-sm">
      <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">Your team</p>
          <h2 className="truncate text-lg font-semibold text-[#293421]">{teamName}</h2>
          <p className="truncate text-sm text-[#626b59]">
            {ownerDisplayName ? `${ownerDisplayName}'s league history is live.` : "League history is live."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 min-[520px]:w-[260px]">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#c8d1be] bg-white px-3 text-sm font-semibold text-[#293421] transition hover:bg-[#f7f8f4]"
          href="/members"
        >
          <UsersRound size={17} aria-hidden="true" />
          View Teams
        </Link>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#c8d1be] bg-white px-3 text-sm font-semibold text-[#293421] transition hover:bg-[#f7f8f4]"
          href="/analytics"
        >
          <BarChart3 size={17} aria-hidden="true" />
          Analytics
        </Link>
        </div>
      </div>
    </section>
  );
}
