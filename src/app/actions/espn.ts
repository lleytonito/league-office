"use server";

import {
  buildAllTimeRanking,
  detectChampionships,
  type EspnIdentityAlias,
  normalizeMatchups,
  normalizeTeams,
} from "@/lib/espn/analytics";
import { fetchEspnAvailableSeasons, fetchEspnSeason, getEspnEnv } from "@/lib/espn/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type EspnActionState = {
  message: string;
  ok: boolean;
};

const emptyState: EspnActionState = { message: "", ok: false };

const linkSchema = z.object({
  espnMemberId: z.string().trim().min(1),
  label: z.string().trim().max(120).optional(),
  memberId: z.string().uuid(),
});

const selfLinkSchema = z.object({
  espnMemberId: z.string().trim().min(1),
});

const removeLinkSchema = z.object({
  memberId: z.string().uuid(),
});

export async function refreshEspnAnalyticsAction(
  previousState: EspnActionState = emptyState,
): Promise<EspnActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);

  if (!actor?.isAdmin) {
    return { message: "Only admins can refresh ESPN analytics.", ok: false };
  }

  const espnEnv = getEspnEnv();
  if (!espnEnv.configured || !espnEnv.leagueId) {
    return { message: `Missing ESPN env: ${espnEnv.missing.join(", ")}`, ok: false };
  }

  const syncRunResult = await supabase
    .from("espn_sync_runs")
    .insert({
      league_id: espnEnv.leagueId,
      status: "running",
      triggered_by_member_id: actor.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (syncRunResult.error) {
    return { message: syncRunResult.error.message, ok: false };
  }

  const syncRunId = syncRunResult.data.id;
  const completed: number[] = [];
  const errors: string[] = [];
  const normalizedTeams = [];
  let seasons: number[] = [];
  const aliases = await fetchIdentityAliases(supabase);

  try {
    seasons = await fetchEspnAvailableSeasons();
  } catch (error) {
    await markSyncRunFailed(supabase, syncRunId, errorMessage(error));
    return { message: `Could not discover ESPN seasons: ${errorMessage(error)}`, ok: false };
  }

  const completedSeasonCandidates = seasons.filter((season) => season < new Date().getFullYear());

  for (const season of seasons) {
    try {
      const seasonData = await fetchEspnSeason(season);
      const seasonTeams = normalizeTeams(season, seasonData, aliases);
      const seasonMatchups = normalizeMatchups(season, seasonData);

      await supabase.from("espn_league_snapshots").upsert(
        {
          fetched_at: new Date().toISOString(),
          league_id: espnEnv.leagueId,
          raw: {
            draftPicks: seasonData.draftDetail?.picks?.length ?? null,
            leagueName: seasonData.settings?.name ?? null,
            matchups: seasonData.schedule?.length ?? null,
            teams: seasonData.teams?.length ?? null,
          },
          season,
          status: "ok",
          sync_run_id: syncRunId,
        },
        { onConflict: "season" },
      );

      await supabase.from("espn_teams").delete().eq("season", season);
      if (seasonTeams.length) {
        const { error } = await supabase.from("espn_teams").insert(
          seasonTeams.map((team) => ({
            abbreviation: team.abbreviation,
            espn_member_id: team.espnMemberId,
            espn_team_id: team.espnTeamId,
            fetched_at: new Date().toISOString(),
            final_rank: team.finalRank,
            logo_url: team.logoUrl,
            owner_display_name: team.ownerDisplayName,
            playoff_seed: team.playoffSeed,
            points: team.points,
            raw: seasonData.teams?.find((espnTeam) => espnTeam.id === team.espnTeamId) ?? {},
            season: team.season,
            sync_run_id: syncRunId,
            team_name: team.teamName,
          })),
        );
        if (error) {
          throw new Error(error.message);
        }
      }

      await supabase.from("espn_matchups").delete().eq("season", season);
      if (seasonMatchups.length) {
        const { error } = await supabase.from("espn_matchups").insert(
          seasonMatchups.map((matchup) => ({
            away_score: matchup.awayScore,
            away_team_id: matchup.awayTeamId,
            espn_matchup_id: matchup.espnMatchupId,
            fetched_at: new Date().toISOString(),
            home_score: matchup.homeScore,
            home_team_id: matchup.homeTeamId,
            matchup_period_id: matchup.matchupPeriodId,
            playoff_tier_type: matchup.playoffTierType,
            raw:
              seasonData.schedule?.find((espnMatchup) => espnMatchup.id === matchup.espnMatchupId) ??
              {},
            season: matchup.season,
            sync_run_id: syncRunId,
            winner: matchup.winner,
          })),
        );
        if (error) {
          throw new Error(error.message);
        }
      }

      normalizedTeams.push(...seasonTeams.filter((team) => completedSeasonCandidates.includes(team.season)));
      completed.push(season);
    } catch (error) {
      errors.push(`${season}: ${errorMessage(error)}`);
      await supabase.from("espn_league_snapshots").upsert(
        {
          error_summary: errorMessage(error),
          fetched_at: new Date().toISOString(),
          league_id: espnEnv.leagueId,
          raw: {},
          season,
          status: "failed",
          sync_run_id: syncRunId,
        },
        { onConflict: "season" },
      );
    }
  }

  const allTimeRanking = buildAllTimeRanking(normalizedTeams);
  const championshipDetections = detectChampionships(normalizedTeams);

  const { error: analyticsError } = await supabase.from("analytics_results").upsert(
    {
      error_summary: errors.length ? errors.join("\n") : null,
      last_refreshed_at: new Date().toISOString(),
      metric_key: "all-time-rankings",
      payload: {
        formula: {
          baselineAverage: 6.5,
          championshipBonus: 3,
          placement: "season team count - final rank + 1",
          priorSeasons: 2,
          runnerUpBonus: 1,
          score: "(totalPoints + baselineAverage * priorSeasons) / (seasonsPlayed + priorSeasons)",
        },
        rankings: allTimeRanking,
        seasonsCompleted: completed.filter((season) => completedSeasonCandidates.includes(season)),
        seasonsWithErrors: errors,
      },
      status: errors.length ? "stale" : "fresh",
      summary: "Placement points with championship and runner-up bonuses.",
      title: "All-Time Rankings",
      updated_by_member_id: actor.id,
    },
    { onConflict: "metric_key" },
  );

  if (analyticsError) {
    errors.push(`analytics: ${analyticsError.message}`);
  }

  const { data: links } = await supabase
    .from("member_team_links")
    .select("member_id, espn_member_id")
    .returns<Array<{ espn_member_id: string; member_id: string }>>();
  const memberByEspnId = new Map((links ?? []).map((link) => [link.espn_member_id, link.member_id]));

  if (championshipDetections.length) {
    const { error } = await supabase.from("championship_detections").upsert(
      championshipDetections.map((detection) => ({
        espn_member_id: detection.espnMemberId,
        espn_team_id: detection.espnTeamId,
        member_id: detection.espnMemberId ? memberByEspnId.get(detection.espnMemberId) ?? null : null,
          runner_up_espn_member_id: detection.runnerUpEspnMemberId,
          runner_up_espn_team_id: detection.runnerUpEspnTeamId,
          owner_display_name: detection.ownerDisplayName,
          runner_up_owner_display_name: detection.runnerUpOwnerDisplayName,
          runner_up_team_name: detection.runnerUpTeamName,
        season: detection.season,
        team_name: detection.teamName,
      })),
      { onConflict: "season" },
    );

    if (error) {
      errors.push(`champions: ${error.message}`);
    }
  }

  await supabase
    .from("espn_sync_runs")
    .update({
      error_summary: errors.length ? errors.join("\n") : null,
      finished_at: new Date().toISOString(),
      seasons_completed: completed,
      seasons_requested: seasons,
      status: errors.length && completed.length ? "partial" : errors.length ? "failed" : "completed",
    })
    .eq("id", syncRunId);

  revalidateAnalyticsPaths();
  return {
    message: errors.length
      ? `Refreshed ${completed.length} seasons with ${errors.length} issue(s). Last good data is still available.`
      : `Refreshed ${completed.length} ESPN seasons.`,
    ok: completed.length > 0,
  };
}

export async function linkMemberToEspnTeamAction(
  previousState: EspnActionState = emptyState,
  formData: FormData,
): Promise<EspnActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);

  if (!actor?.isAdmin) {
    return { message: "Only admins can link ESPN teams.", ok: false };
  }

  const parsed = linkSchema.safeParse({
    espnMemberId: stringValue(formData.get("espnMemberId")),
    label: stringValue(formData.get("label")),
    memberId: stringValue(formData.get("memberId")),
  });

  if (!parsed.success) {
    return { message: "Choose a member and ESPN team.", ok: false };
  }

  const { error } = await supabase.from("member_team_links").upsert(
    {
      created_by_member_id: actor.id,
      espn_member_id: parsed.data.espnMemberId,
      label: parsed.data.label || null,
      member_id: parsed.data.memberId,
    },
    { onConflict: "member_id" },
  );

  if (error) {
    return { message: error.message, ok: false };
  }

  await refreshDetectedChampionMemberLinks(supabase);
  revalidateAnalyticsPaths();
  return { message: "ESPN team linked.", ok: true };
}

export async function selectOwnEspnTeamAction(
  previousState: EspnActionState = emptyState,
  formData: FormData,
): Promise<EspnActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);

  if (!actor?.isActive) {
    return { message: "You need active league access to select your team.", ok: false };
  }

  const parsed = selfLinkSchema.safeParse({
    espnMemberId: stringValue(formData.get("espnMemberId")),
  });

  if (!parsed.success) {
    return { message: "Choose your ESPN team.", ok: false };
  }

  const [{ data: existingLink }, { data: claimedByAnother }, { data: currentTeam }] = await Promise.all([
    supabase
      .from("member_team_links")
      .select("id")
      .eq("member_id", actor.id)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("member_team_links")
      .select("member_id")
      .eq("espn_member_id", parsed.data.espnMemberId)
      .neq("member_id", actor.id)
      .maybeSingle<{ member_id: string }>(),
    supabase
      .from("espn_teams")
      .select("season, espn_member_id")
      .eq("espn_member_id", parsed.data.espnMemberId)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle<{ espn_member_id: string; season: number }>(),
  ]);

  if (existingLink) {
    return { message: "Your profile is already linked. Ask the commissioner if this needs to change.", ok: false };
  }

  if (claimedByAnother) {
    return { message: "That ESPN team is already linked.", ok: false };
  }

  if (!currentTeam) {
    return { message: "That ESPN team is not available to select.", ok: false };
  }

  const { error } = await supabase.from("member_team_links").insert({
    created_by_member_id: actor.id,
    espn_member_id: parsed.data.espnMemberId,
    member_id: actor.id,
  });

  if (error) {
    return { message: error.message, ok: false };
  }

  await refreshDetectedChampionMemberLinks(supabase);
  revalidateAnalyticsPaths();
  return { message: "Team linked.", ok: true };
}

export async function removeMemberTeamLinkAction(
  previousState: EspnActionState = emptyState,
  formData: FormData,
): Promise<EspnActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);

  if (!actor?.isAdmin) {
    return { message: "Only admins can remove ESPN team links.", ok: false };
  }

  const parsed = removeLinkSchema.safeParse({
    memberId: stringValue(formData.get("memberId")),
  });

  if (!parsed.success) {
    return { message: "Choose a linked member.", ok: false };
  }

  const { error } = await supabase.from("member_team_links").delete().eq("member_id", parsed.data.memberId);

  if (error) {
    return { message: error.message, ok: false };
  }

  await refreshDetectedChampionMemberLinks(supabase);
  revalidateAnalyticsPaths();
  return { message: "ESPN team link removed.", ok: true };
}

export async function applyDetectedChampionBadgesAction(
  previousState: EspnActionState = emptyState,
): Promise<EspnActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);

  if (!actor?.isAdmin) {
    return { message: "Only admins can apply championship badges.", ok: false };
  }

  const [{ data: badge }, { data: detections }] = await Promise.all([
    supabase
      .from("badge_definitions")
      .select("id")
      .eq("slug", "league-champion")
      .maybeSingle<{ id: string }>(),
    supabase
      .from("championship_detections")
      .select("season, member_id")
      .not("member_id", "is", null)
      .returns<Array<{ member_id: string; season: number }>>(),
  ]);

  if (!badge) {
    return { message: "League Champion badge definition was not found.", ok: false };
  }

  const ringCounts = new Map<string, number>();
  for (const detection of detections ?? []) {
    ringCounts.set(detection.member_id, (ringCounts.get(detection.member_id) ?? 0) + 1);
  }

  if (!ringCounts.size) {
    return { message: "No linked championship detections are ready to apply.", ok: false };
  }

  const { error } = await supabase.from("member_badges").upsert(
    [...ringCounts.entries()].map(([memberId, quantity]) => ({
      awarded_by_member_id: actor.id,
      badge_id: badge.id,
      member_id: memberId,
      quantity,
    })),
    { onConflict: "member_id,badge_id" },
  );

  if (error) {
    return { message: error.message, ok: false };
  }

  await supabase
    .from("championship_detections")
    .update({ applied_at: new Date().toISOString() })
    .not("member_id", "is", null);

  revalidateAnalyticsPaths();
  return { message: `Applied championship badges for ${ringCounts.size} linked member(s).`, ok: true };
}

function revalidateAnalyticsPaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/analytics");
  revalidatePath("/members");
}

async function refreshDetectedChampionMemberLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const [{ data: links }, { data: detections }] = await Promise.all([
    supabase
      .from("member_team_links")
      .select("member_id, espn_member_id")
      .returns<Array<{ espn_member_id: string; member_id: string }>>(),
    supabase
      .from("championship_detections")
      .select("season, espn_member_id")
      .returns<Array<{ espn_member_id: string | null; season: number }>>(),
  ]);
  const memberByEspnId = new Map((links ?? []).map((link) => [link.espn_member_id, link.member_id]));

  await Promise.all(
    (detections ?? []).map((detection) =>
      supabase
        .from("championship_detections")
        .update({
          member_id: detection.espn_member_id
            ? memberByEspnId.get(detection.espn_member_id) ?? null
            : null,
        })
        .eq("season", detection.season),
    ),
  );
}

async function fetchIdentityAliases(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("espn_identity_aliases")
    .select("espn_member_id, canonical_espn_member_id, canonical_owner_display_name")
    .returns<Array<{
      canonical_espn_member_id: string;
      canonical_owner_display_name: string;
      espn_member_id: string;
    }>>();

  return new Map<string, EspnIdentityAlias>(
    (data ?? []).map((alias) => [
      alias.espn_member_id,
      {
        canonicalEspnMemberId: alias.canonical_espn_member_id,
        canonicalOwnerDisplayName: alias.canonical_owner_display_name,
      },
    ]),
  );
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function markSyncRunFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  syncRunId: string,
  message: string,
) {
  await supabase
    .from("espn_sync_runs")
    .update({
      error_summary: message,
      finished_at: new Date().toISOString(),
      status: "failed",
    })
    .eq("id", syncRunId);
}

async function getCurrentMember(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("league_members")
    .select("id, is_admin, is_member, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      id: string;
      is_admin: boolean;
      is_member: boolean;
      revoked_at: string | null;
    }>();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    isActive: data.is_member && !data.revoked_at,
    isAdmin: data.is_admin && data.is_member && !data.revoked_at,
  };
}
