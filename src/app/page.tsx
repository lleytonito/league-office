import { ShieldCheck, Trophy, Vote } from "lucide-react";

const setupItems = [
  {
    title: "Auth",
    body: "Supabase SSR clients and session proxy are wired.",
    Icon: ShieldCheck,
  },
  {
    title: "Voting",
    body: "Mobile test coverage is ready for core flows.",
    Icon: Vote,
  },
  {
    title: "Deploy",
    body: "Netlify build settings are checked into the repo.",
    Icon: Trophy,
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#151712]">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#182214] text-white">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3e4a36]">
              League Office
            </span>
          </div>
          <span className="rounded-full border border-[#d6dacb] px-3 py-1 text-xs font-medium text-[#5c6654]">
            Setup pass
          </span>
        </header>

        <div className="grid gap-8 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-6">
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-normal text-[#11130f] sm:text-6xl">
              League Office, ready for kickoff.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[#596153]">
              The foundation is in place for Google sign-in, member profiles,
              proposal review, voting windows, results, and commissioner tools.
            </p>
          </div>

          <div className="grid gap-3">
            {setupItems.map(({ title, body, Icon }) => (
              <div
                key={title}
                className="flex gap-4 rounded-lg border border-[#d9decf] bg-white/70 p-4 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#e9eee0] text-[#26351f]">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#161a12]">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#626b59]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
