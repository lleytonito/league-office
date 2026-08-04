import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BarChart3, Trophy } from "lucide-react";
import Link from "next/link";

type Member = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type AllTimeRankingRow = {
  championships: number;
  latestTeamName: string;
  managerLabel: string;
  placementPoints: number;
  powerScore: number;
  runnerUps: number;
  seasonsPlayed: number;
  totalPoints: number;
};

type AnalyticsResult = {
  last_refreshed_at: string | null;
  payload: {
    rankings?: AllTimeRankingRow[];
    seasonsCompleted?: number[];
    seasonsWithErrors?: string[];
  };
  status: string;
};

const powerFormula = {
  baselineAverage: 6.5,
  priorSeasons: 2,
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const { data: member } = await supabase
    .from("league_members")
    .select("display_name, team_name, is_member, is_admin, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<Member>();
  const { data: rankingResult, error } = await supabase
    .from("analytics_results")
    .select("payload, status, last_refreshed_at")
    .eq("metric_key", "all-time-rankings")
    .maybeSingle<AnalyticsResult>();
  const rankings = rankingResult?.payload?.rankings ?? [];
  const completedSeasons = rankingResult?.payload?.seasonsCompleted ?? [];
  const hasWarnings = Boolean(rankingResult?.payload?.seasonsWithErrors?.length);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>
        <header className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#587246]" size={22} aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold">Analytics</h1>
            </div>
          </div>
        </header>

        {error ? (
          <p className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            Analytics could not load.
          </p>
        ) : (
          <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">All-Time Rankings</h2>
                <details className="group mt-1">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[#587246] transition hover:text-[#3e4a36]">
                    <span className="group-open:hidden">Click for details</span>
                    <span className="hidden group-open:inline">Hide details</span>
                  </summary>
                  <div className="mt-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3 text-sm leading-6 text-[#626b59]">
                    <p>Power score blends placement points, championship results, and seasons played.</p>
                    <div className="mt-3 grid gap-3 rounded-[8px] bg-white p-3 text-[#293421]">
                      <div className="grid gap-1 font-mono text-sm">
                        <span>PWR = (TP + B × K) / (S + K)</span>
                        <span>
                          TP = Σ(L<sub>s</sub> - R<sub>s</sub> + 1) + 3C + RU
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
                </details>
              </div>
              {rankingResult?.last_refreshed_at ? (
                <span className="rounded-full bg-[#e9eee0] px-3 py-1 text-xs font-semibold text-[#3e4a36]">
                  Refreshed {new Date(rankingResult.last_refreshed_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>

            {hasWarnings ? (
              <p className="mt-3 rounded-[8px] bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                Some historical seasons were unavailable, so this is based on the latest successful refresh.
              </p>
            ) : null}

            {rankings.length ? (
              <div className="mt-4 grid gap-2">
                {rankings.map((row, index) => (
                  <article
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-3"
                    key={`${row.latestTeamName}-${index}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#183a2b] text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[#293421]">{row.managerLabel}</h3>
                      <p className="text-sm text-[#626b59]">
                        {row.latestTeamName} · {row.seasonsPlayed} seasons · {row.totalPoints} total pts
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
                ))}
              </div>
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
        )}
      </section>
    </main>
  );
}
