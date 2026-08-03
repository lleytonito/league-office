import { ClipboardList, ScrollText } from "lucide-react";
import Link from "next/link";

export function HomeActionPanel() {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-[#4e5a45]">
        Submit rule ideas for commissioner review! Approved proposals appear on the feed for league
        voting, and results unlock after you vote.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e]"
          href="/submit"
        >
          <ClipboardList size={17} aria-hidden="true" />
          Submit proposal
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#cfd8c4] bg-[#f7f8f4] px-4 text-sm font-semibold text-[#293421] transition hover:bg-[#eef2e8]"
          href="/rules"
        >
          <ScrollText size={17} aria-hidden="true" />
          Last Year&apos;s Rules
        </Link>
      </div>
    </section>
  );
}
