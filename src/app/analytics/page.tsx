import { AllTimeRankingsCard, type AllTimeRankingRow } from "@/components/analytics/all-time-rankings-card";
import { LuckIndexCard, type LuckIndexRow } from "@/components/analytics/luck-index-card";
import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";

type Member = {
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
    luckIndex?: LuckIndexRow[];
    rankings?: AllTimeRankingRow[];
    seasonsCompleted?: number[];
    seasonsWithErrors?: string[];
  };
  status: string;
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
  const { data: analyticsResults, error } = await supabase
    .from("analytics_results")
    .select("metric_key, payload, status, last_refreshed_at")
    .in("metric_key", ["all-time-rankings", "luck-index"])
    .returns<AnalyticsResult[]>();
  const resultByKey = new Map((analyticsResults ?? []).map((result) => [result.metric_key, result]));
  const rankingResult = resultByKey.get("all-time-rankings") ?? null;
  const luckResult = resultByKey.get("luck-index") ?? null;
  const rankings = rankingResult?.payload?.rankings ?? [];
  const luckIndex = luckResult?.payload?.luckIndex ?? [];
  const completedSeasons = rankingResult?.payload?.seasonsCompleted ?? [];
  const rankingHasWarnings = Boolean(rankingResult?.payload?.seasonsWithErrors?.length);
  const luckHasWarnings = Boolean(luckResult?.payload?.seasonsWithErrors?.length);

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
            <AllTimeRankingsCard
              completedSeasons={completedSeasons}
              hasWarnings={rankingHasWarnings}
              lastRefreshedAt={rankingResult?.last_refreshed_at ?? null}
              rankings={rankings}
            />
            <LuckIndexCard
              hasWarnings={luckHasWarnings}
              lastRefreshedAt={luckResult?.last_refreshed_at ?? null}
              rows={luckIndex}
            />
          </>
        )}
      </section>
    </main>
  );
}
