import { AllTimeRankingsCard, type AllTimeRankingRow } from "@/components/analytics/all-time-rankings-card";
import { AccoladesCard, type AccoladeRecord } from "@/components/analytics/accolades-card";
import { AveragePointsCard, type AveragePointsRow } from "@/components/analytics/average-points-card";
import { LuckIndexCard, type LuckIndexRow } from "@/components/analytics/luck-index-card";
import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";

type Member = {
  id: string;
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type AnalyticsResult = {
  metric_key: string;
  last_refreshed_at: string | null;
  payload: {
    records?: AccoladeRecord[];
    rankings?: AllTimeRankingRow[] | AveragePointsRow[];
    luckIndex?: LuckIndexRow[];
    seasonsCompleted?: number[];
    seasonsWithErrors?: string[];
  };
  status: string;
};

type TeamLinkRow = {
  espn_member_id: string;
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
    .select("id, display_name, team_name, is_member, is_admin, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<Member>();
  const [{ data: analyticsResults, error }, { data: currentLink }] = await Promise.all([
    supabase
      .from("analytics_results")
      .select("metric_key, payload, status, last_refreshed_at")
      .in("metric_key", ["all-time-rankings", "luck-index", "average-points", "accolades"])
      .returns<AnalyticsResult[]>(),
    member
      ? supabase
          .from("member_team_links")
          .select("espn_member_id")
          .eq("member_id", member.id)
          .maybeSingle<TeamLinkRow>()
      : { data: null },
  ]);
  const resultByKey = new Map((analyticsResults ?? []).map((result) => [result.metric_key, result]));
  const rankingResult = resultByKey.get("all-time-rankings") ?? null;
  const luckResult = resultByKey.get("luck-index") ?? null;
  const averagePointsResult = resultByKey.get("average-points") ?? null;
  const accoladesResult = resultByKey.get("accolades") ?? null;
  const rankings = (rankingResult?.payload?.rankings ?? []) as AllTimeRankingRow[];
  const luckIndex = luckResult?.payload?.luckIndex ?? [];
  const averagePoints = (averagePointsResult?.payload?.rankings ?? []) as AveragePointsRow[];
  const accoladeRecords = accoladesResult?.payload?.records ?? [];
  const completedSeasons = rankingResult?.payload?.seasonsCompleted ?? [];
  const rankingHasWarnings = Boolean(rankingResult?.payload?.seasonsWithErrors?.length);
  const luckHasWarnings = Boolean(luckResult?.payload?.seasonsWithErrors?.length);
  const averagePointsHasWarnings = Boolean(averagePointsResult?.payload?.seasonsWithErrors?.length);
  const currentEspnMemberId = currentLink?.espn_member_id ?? null;

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
            <h1 className="text-2xl font-semibold">Analytics</h1>
          </div>
        </header>

        {error ? (
          <p className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            Analytics could not load.
          </p>
        ) : (
          <>
            <section className="grid gap-3" id="historical-rankings">
              <div className="px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">
                  Historical Rankings
                </p>
              </div>
              <AllTimeRankingsCard
                completedSeasons={completedSeasons}
                currentEspnMemberId={currentEspnMemberId}
                hasWarnings={rankingHasWarnings}
                lastRefreshedAt={rankingResult?.last_refreshed_at ?? null}
                rankings={rankings}
              />
              <LuckIndexCard
                currentEspnMemberId={currentEspnMemberId}
                hasWarnings={luckHasWarnings}
                lastRefreshedAt={luckResult?.last_refreshed_at ?? null}
                rows={luckIndex}
              />
              <AveragePointsCard
                currentEspnMemberId={currentEspnMemberId}
                hasWarnings={averagePointsHasWarnings}
                lastRefreshedAt={averagePointsResult?.last_refreshed_at ?? null}
                rows={averagePoints}
              />
            </section>
            <section className="grid gap-3" id="accolades">
              <div className="px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">
                  Accolades
                </p>
              </div>
              <AccoladesCard records={accoladeRecords} />
            </section>
          </>
        )}
      </section>
    </main>
  );
}
