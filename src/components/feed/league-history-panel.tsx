import { BarChart3, UsersRound } from "lucide-react";
import Link from "next/link";

export function LeagueHistoryPanel() {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-[#4e5a45]">
        League history is live. Compare team profiles, head-to-head records, and all-time standings from ESPN history.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e]"
          href="/members"
        >
          <UsersRound size={17} aria-hidden="true" />
          Teams
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#cfd8c4] bg-[#f7f8f4] px-4 text-sm font-semibold text-[#293421] transition hover:bg-[#eef2e8]"
          href="/analytics"
        >
          <BarChart3 size={17} aria-hidden="true" />
          Analytics
        </Link>
      </div>
    </section>
  );
}
