import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

loadDotEnv(".env.local");

const ESPN_BASE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";
const DEFAULT_VIEWS = [
  "mSettings",
  "mTeam",
  "mStandings",
  "mSchedule",
  "mMatchup",
  "mMatchupScore",
  "mRoster",
  "mBoxscore",
  "mDraftDetail",
];
const LEAGUE_ID = requiredEnv("ESPN_LEAGUE_ID");
const SWID = requiredEnv("ESPN_SWID");
const ESPN_S2 = requiredEnv("ESPN_S2");

const startedAt = new Date().toISOString();
const syncRunId = randomUUID();
const seasons = await fetchAvailableSeasons();
const completedSeasonCandidates = seasons.filter((season) => season < new Date().getFullYear());
const completed = [];
const errors = [];
const allTeams = [];
const allMatchups = [];
const snapshots = [];
const aliases = await fetchIdentityAliases();

for (const season of seasons) {
  try {
    const data = await fetchSeason(season);
    const teams = normalizeTeams(season, data, aliases);
    const matchups = normalizeMatchups(season, data);
    allTeams.push(...teams);
    allMatchups.push(...matchups);
    snapshots.push({
      draftPicks: data.draftDetail?.picks?.length ?? null,
      leagueName: data.settings?.name ?? null,
      matchups: data.schedule?.length ?? null,
      season,
      teams: data.teams?.length ?? null,
    });
    completed.push(season);
    console.log(`Fetched ${season}: ${teams.length} teams, ${matchups.length} decided matchups`);
  } catch (error) {
    errors.push(`${season}: ${errorMessage(error)}`);
    console.warn(`Failed ${season}: ${errorMessage(error)}`);
  }
}

const completedTeams = allTeams.filter((team) => completedSeasonCandidates.includes(team.season));
const rankings = buildAllTimeRanking(completedTeams);
const luckIndex = buildLuckIndex(completedTeams, allTeams);
const averagePoints = buildAveragePointsRanking(completedTeams, allTeams);
const accoladeRecords = buildAccoladeRecords(allTeams, allMatchups);
const champions = detectChampionships(completedTeams);
const sql = buildRefreshSql({
  accoladeRecords,
  averagePoints,
  champions,
  completed,
  errors,
  matchups: allMatchups,
  rankings,
  luckIndex,
  seasons,
  snapshots,
  startedAt,
  syncRunId,
  teams: allTeams,
});

const tempDir = mkdtempSync(join(tmpdir(), "league-office-espn-"));
const sqlPath = join(tempDir, "refresh.sql");
try {
  writeFileSync(sqlPath, sql);
  runSupabaseCli(["db", "query", "--linked", "--file", sqlPath], { stdio: "inherit" });
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

console.log(
  `Refreshed ${completed.length}/${seasons.length} seasons. Rankings: ${rankings.length}. Accolades: ${accoladeRecords.length}. Errors: ${errors.length}.`,
);

function buildRefreshSql({
  accoladeRecords,
  averagePoints,
  champions,
  completed,
  errors,
  matchups,
  rankings,
  seasons,
  snapshots,
  startedAt,
  syncRunId,
  teams,
}) {
  const completedAnalyticsSeasons = completed.filter((season) => completedSeasonCandidates.includes(season));
  const statements = [
    "begin;",
    `insert into public.espn_sync_runs (id, status, league_id, seasons_requested, seasons_completed, error_summary, started_at, finished_at)
values (${literal(syncRunId)}::uuid, ${literal(statusFor(errors, completed))}, ${literal(LEAGUE_ID)}, ${intArray(seasons)}, ${intArray(completed)}, ${nullable(errors.join("\n"))}, ${literal(startedAt)}::timestamptz, now())
on conflict (id) do nothing;`,
    ...snapshots.map(
      (snapshot) => `insert into public.espn_league_snapshots (season, league_id, raw, status, error_summary, fetched_at, sync_run_id)
values (${snapshot.season}, ${literal(LEAGUE_ID)}, ${jsonLiteral(snapshot)}, 'ok', null, now(), ${literal(syncRunId)}::uuid)
on conflict (season) do update
set league_id = excluded.league_id, raw = excluded.raw, status = excluded.status, error_summary = null, fetched_at = excluded.fetched_at, sync_run_id = excluded.sync_run_id;`,
    ),
    teams.length
      ? `delete from public.espn_teams where season = any(${intArray(seasons)});
insert into public.espn_teams (season, espn_team_id, espn_member_id, owner_display_name, team_name, abbreviation, logo_url, final_rank, playoff_seed, points, raw, fetched_at, sync_run_id)
values
${teams.map(teamValue).join(",\n")};`
      : "",
    matchups.length
      ? `delete from public.espn_matchups where season = any(${intArray(seasons)});
insert into public.espn_matchups (season, espn_matchup_id, matchup_period_id, home_team_id, away_team_id, home_score, away_score, winner, playoff_tier_type, raw, fetched_at, sync_run_id)
values
${matchups.map(matchupValue).join(",\n")};`
      : "",
    `insert into public.analytics_results (metric_key, title, summary, payload, status, error_summary, last_refreshed_at, updated_at)
values ('all-time-rankings', 'All-Time Rankings', 'Power score with placement points and championship bonuses.', ${jsonLiteral({
      formula: {
        baselineAverage: 6.5,
        championshipBonus: 3,
        placement: "season team count - final rank + 1",
        priorSeasons: 2,
        runnerUpBonus: 1,
        score: "(totalPoints + baselineAverage * priorSeasons) / (seasonsPlayed + priorSeasons)",
      },
      rankings,
      seasonsCompleted: completedAnalyticsSeasons,
      seasonsWithErrors: errors,
    })}, ${literal(errors.length ? "stale" : "fresh")}, ${nullable(errors.join("\n"))}, now(), now())
on conflict (metric_key) do update
set title = excluded.title, summary = excluded.summary, payload = excluded.payload, status = excluded.status, error_summary = excluded.error_summary, last_refreshed_at = excluded.last_refreshed_at, updated_at = now();`,
    `insert into public.analytics_results (metric_key, title, summary, payload, status, error_summary, last_refreshed_at, updated_at)
values ('luck-index', 'Luck Index', 'Points-for rank compared to final ESPN finish for current active teams.', ${jsonLiteral({
      formula: {
        expectedRank: "points-for rank within season",
        score: "average(expected rank - final rank)",
      },
      luckIndex,
      seasonsCompleted: completedAnalyticsSeasons,
      seasonsWithErrors: errors,
    })}, ${literal(errors.length ? "stale" : "fresh")}, ${nullable(errors.join("\n"))}, now(), now())
on conflict (metric_key) do update
set title = excluded.title, summary = excluded.summary, payload = excluded.payload, status = excluded.status, error_summary = excluded.error_summary, last_refreshed_at = excluded.last_refreshed_at, updated_at = now();`,
    `insert into public.analytics_results (metric_key, title, summary, payload, status, error_summary, last_refreshed_at, updated_at)
values ('average-points', 'Average Points Scored', 'Average ESPN season points for current active teams.', ${jsonLiteral({
      formula: {
        score: "average ESPN season points across completed scored seasons",
      },
      rankings: averagePoints,
      seasonsCompleted: completedAnalyticsSeasons,
      seasonsWithErrors: errors,
    })}, ${literal(errors.length ? "stale" : "fresh")}, ${nullable(errors.join("\n"))}, now(), now())
on conflict (metric_key) do update
set title = excluded.title, summary = excluded.summary, payload = excluded.payload, status = excluded.status, error_summary = excluded.error_summary, last_refreshed_at = excluded.last_refreshed_at, updated_at = now();`,
    `insert into public.analytics_results (metric_key, title, summary, payload, status, error_summary, last_refreshed_at, updated_at)
values ('accolades', 'Accolades', 'Current record-holder accolades for active teams.', ${jsonLiteral({
      records: accoladeRecords,
      seasonsCompleted: completedAnalyticsSeasons,
      seasonsWithErrors: errors,
    })}, ${literal(errors.length ? "stale" : "fresh")}, ${nullable(errors.join("\n"))}, now(), now())
on conflict (metric_key) do update
set title = excluded.title, summary = excluded.summary, payload = excluded.payload, status = excluded.status, error_summary = excluded.error_summary, last_refreshed_at = excluded.last_refreshed_at, updated_at = now();`,
    champions.length
      ? `insert into public.championship_detections (season, espn_team_id, espn_member_id, owner_display_name, team_name, member_id, runner_up_espn_team_id, runner_up_espn_member_id, runner_up_owner_display_name, runner_up_team_name, updated_at)
values
${champions.map(championValue).join(",\n")}
on conflict (season) do update
set espn_team_id = excluded.espn_team_id, espn_member_id = excluded.espn_member_id, owner_display_name = excluded.owner_display_name, team_name = excluded.team_name, member_id = excluded.member_id, runner_up_espn_team_id = excluded.runner_up_espn_team_id, runner_up_espn_member_id = excluded.runner_up_espn_member_id, runner_up_owner_display_name = excluded.runner_up_owner_display_name, runner_up_team_name = excluded.runner_up_team_name, updated_at = now();`
      : "",
    "commit;",
  ];

  return statements.filter(Boolean).join("\n\n");
}

function teamValue(team) {
  return `(${team.season}, ${team.espnTeamId}, ${nullable(team.espnMemberId)}, ${nullable(team.ownerDisplayName)}, ${literal(team.teamName)}, ${nullable(team.abbreviation)}, ${nullable(team.logoUrl)}, ${nullable(team.finalRank)}, ${nullable(team.playoffSeed)}, ${nullable(team.points)}, '{}'::jsonb, now(), ${literal(syncRunId)}::uuid)`;
}

function matchupValue(matchup) {
  return `(${matchup.season}, ${matchup.espnMatchupId}, ${matchup.matchupPeriodId}, ${nullable(matchup.homeTeamId)}, ${nullable(matchup.awayTeamId)}, ${nullable(matchup.homeScore)}, ${nullable(matchup.awayScore)}, ${nullable(matchup.winner)}, ${nullable(matchup.playoffTierType)}, '{}'::jsonb, now(), ${literal(syncRunId)}::uuid)`;
}

function championValue(champion) {
  return `(${champion.season}, ${champion.espnTeamId}, ${nullable(champion.espnMemberId)}, ${nullable(champion.ownerDisplayName)}, ${literal(champion.teamName)}, (select member_id from public.member_team_links where espn_member_id = ${nullable(champion.espnMemberId)} limit 1), ${nullable(champion.runnerUpEspnTeamId)}, ${nullable(champion.runnerUpEspnMemberId)}, ${nullable(champion.runnerUpOwnerDisplayName)}, ${nullable(champion.runnerUpTeamName)}, now())`;
}

async function fetchAvailableSeasons() {
  const currentSeason = await fetchSeason(new Date().getFullYear());
  const previousSeasons = currentSeason.status?.previousSeasons ?? [];
  return [...new Set([...previousSeasons, new Date().getFullYear()])].sort((a, b) => a - b);
}

async function fetchSeason(season) {
  const currentUrl = buildSeasonUrl(season);
  const currentResponse = await espnFetch(currentUrl);
  if (currentResponse.ok) {
    return currentResponse.json();
  }

  if (season <= 2017) {
    const legacyResponse = await espnFetch(buildLegacySeasonUrl(season));
    if (!legacyResponse.ok) {
      throw new Error(`ESPN returned ${legacyResponse.status} for ${season}`);
    }
    const data = await legacyResponse.json();
    return Array.isArray(data) ? data[0] : data;
  }

  throw new Error(`ESPN returned ${currentResponse.status} for ${season}`);
}

function normalizeTeams(season, data, identityAliases = new Map()) {
  const memberNames = new Map(
    (data.members ?? [])
      .filter((member) => member.id)
      .map((member) => [member.id, espnMemberDisplayName(member)]),
  );

  return (data.teams ?? []).flatMap((team) => {
    if (!Number.isFinite(team.id)) return [];
    const rawEspnMemberId = team.primaryOwner ?? team.owners?.[0] ?? null;
    const alias = rawEspnMemberId ? identityAliases.get(rawEspnMemberId) : null;
    const espnMemberId = alias?.canonicalEspnMemberId ?? rawEspnMemberId;
    const ownerDisplayName =
      alias?.canonicalOwnerDisplayName ??
      (rawEspnMemberId ? memberNames.get(rawEspnMemberId) ?? null : null);
    return [{
      abbreviation: team.abbrev ?? null,
      espnMemberId,
      espnTeamId: team.id,
      finalRank: positiveInteger(team.rankCalculatedFinal) ?? positiveInteger(team.rankFinal),
      logoUrl: team.logo ?? null,
      ownerDisplayName,
      playoffSeed: positiveInteger(team.playoffSeed),
      points: finiteNumber(team.points),
      season,
      teamName: team.name || `Team ${team.id}`,
    }];
  });
}

function fetchIdentityAliases() {
  try {
    const output = runSupabaseCli(
      [
        "db",
        "query",
        "--linked",
        "--output",
        "json",
        "select espn_member_id, canonical_espn_member_id, canonical_owner_display_name from public.espn_identity_aliases;",
      ],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(extractJsonObject(output));
    return new Map(
      (parsed.rows ?? []).map((row) => [
        row.espn_member_id,
        {
          canonicalEspnMemberId: row.canonical_espn_member_id,
          canonicalOwnerDisplayName: row.canonical_owner_display_name,
        },
      ]),
    );
  } catch {
    return new Map();
  }
}

function runSupabaseCli(args, options = {}) {
  if (process.platform !== "win32") {
    return execFileSync("npx", ["supabase", ...args], { cwd: process.cwd(), ...options });
  }

  return execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ["npx", "supabase", ...args.map(powerShellQuote)].join(" "),
    ],
    { cwd: process.cwd(), ...options },
  );
}

function powerShellQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function extractJsonObject(output) {
  const text = String(output);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Supabase CLI did not return JSON output.");
  }
  return text.slice(start, end + 1);
}

function normalizeMatchups(season, data) {
  return (data.schedule ?? []).flatMap((matchup, index) => {
    const homeTeamId = positiveInteger(matchup.home?.teamId);
    const awayTeamId = positiveInteger(matchup.away?.teamId);
    const winner = matchup.winner ?? null;
    if (!homeTeamId || !awayTeamId || !winner || winner === "UNDECIDED") return [];
    return [{
      awayScore: finiteNumber(matchup.away?.totalPoints),
      awayTeamId,
      espnMatchupId: positiveInteger(matchup.id) ?? season * 1000 + index,
      homeScore: finiteNumber(matchup.home?.totalPoints),
      homeTeamId,
      matchupPeriodId: positiveInteger(matchup.matchupPeriodId) ?? 0,
      playoffTierType: matchup.playoffTierType ?? null,
      season,
      winner,
    }];
  });
}

function buildAllTimeRanking(teams) {
  const completedTeams = teams.filter((team) => team.finalRank && team.finalRank > 0);
  const seasonSizes = new Map();
  for (const team of completedTeams) {
    seasonSizes.set(team.season, Math.max(seasonSizes.get(team.season) ?? 0, team.finalRank ?? 0));
  }

  const rows = new Map();
  for (const team of completedTeams) {
    const key = team.espnMemberId ?? `team:${team.espnTeamId}`;
    const seasonSize = seasonSizes.get(team.season) ?? 12;
    const placementPoints = Math.max(seasonSize - (team.finalRank ?? seasonSize) + 1, 1);
    const isChampion = team.finalRank === 1;
    const isRunnerUp = team.finalRank === 2;
    const existing = rows.get(key) ?? {
      championshipBonus: 0,
      championships: 0,
      espnMemberId: team.espnMemberId,
      latestTeamName: team.teamName,
      managerLabel: team.ownerDisplayName ?? team.teamName,
      placementPoints: 0,
      powerScore: 0,
      runnerUpBonus: 0,
      runnerUps: 0,
      seasonsPlayed: 0,
      totalPoints: 0,
    };
    existing.latestTeamName = team.teamName;
    existing.managerLabel = team.ownerDisplayName ?? team.teamName;
    existing.placementPoints += placementPoints;
    existing.championships += isChampion ? 1 : 0;
    existing.runnerUps += isRunnerUp ? 1 : 0;
    existing.championshipBonus += isChampion ? 3 : 0;
    existing.runnerUpBonus += isRunnerUp ? 1 : 0;
    existing.seasonsPlayed += 1;
    existing.totalPoints = existing.placementPoints + existing.championshipBonus + existing.runnerUpBonus;
    existing.powerScore = roundOne((existing.totalPoints + 6.5 * 2) / (existing.seasonsPlayed + 2));
    rows.set(key, existing);
  }

  return [...rows.values()].sort((a, b) => {
    if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
    if (b.championships !== a.championships) return b.championships - a.championships;
    return a.managerLabel.localeCompare(b.managerLabel);
  });
}

function buildLuckIndex(completedTeams, allTeams) {
  const latestSeason = maxNumber(allTeams.map((team) => team.season));
  if (!latestSeason) return [];

  const activeTeams = allTeams.filter((team) => team.season === latestSeason && team.espnMemberId);
  const activeEspnMemberIds = new Set(activeTeams.map((team) => team.espnMemberId));
  const latestTeamByMemberId = new Map(activeTeams.map((team) => [team.espnMemberId, team]));
  const rows = new Map();
  const pointRankTeams = completedTeams.filter((team) => team.finalRank && team.finalRank > 0 && team.points !== null);
  const completedActiveTeams = pointRankTeams.filter(
    (team) =>
      team.espnMemberId &&
      activeEspnMemberIds.has(team.espnMemberId),
  );
  const teamsBySeason = groupBy(pointRankTeams, (team) => team.season);

  for (const seasonTeams of teamsBySeason.values()) {
    const pointsRanks = rankTeamsByPoints(seasonTeams);

    for (const team of seasonTeams.filter((item) => completedActiveTeams.includes(item))) {
      const expectedRank = pointsRanks.get(`${team.season}:${team.espnTeamId}`);
      const actualRank = team.finalRank;
      if (!expectedRank || !actualRank) continue;

      const latestTeam = latestTeamByMemberId.get(team.espnMemberId) ?? team;
      const existing = rows.get(team.espnMemberId) ?? {
        actualRankTotal: 0,
        averageActualRank: null,
        averageExpectedRank: null,
        espnMemberId: team.espnMemberId,
        expectedRankTotal: 0,
        latestTeamName: latestTeam.teamName,
        luckScore: 0,
        managerLabel: latestTeam.ownerDisplayName ?? latestTeam.teamName,
        seasonsPlayed: 0,
        totalLuck: 0,
      };

      existing.latestTeamName = latestTeam.teamName;
      existing.managerLabel = latestTeam.ownerDisplayName ?? latestTeam.teamName;
      existing.actualRankTotal += actualRank;
      existing.expectedRankTotal += expectedRank;
      existing.totalLuck += expectedRank - actualRank;
      existing.seasonsPlayed += 1;
      existing.averageActualRank = roundOne(existing.actualRankTotal / existing.seasonsPlayed);
      existing.averageExpectedRank = roundOne(existing.expectedRankTotal / existing.seasonsPlayed);
      existing.luckScore = roundOne(existing.totalLuck / existing.seasonsPlayed);
      rows.set(team.espnMemberId, existing);
    }
  }

  for (const [espnMemberId, latestTeam] of latestTeamByMemberId) {
    if (!rows.has(espnMemberId)) {
      rows.set(espnMemberId, {
        actualRankTotal: 0,
        averageActualRank: null,
        averageExpectedRank: null,
        espnMemberId,
        expectedRankTotal: 0,
        latestTeamName: latestTeam.teamName,
        luckScore: 0,
        managerLabel: latestTeam.ownerDisplayName ?? latestTeam.teamName,
        seasonsPlayed: 0,
        totalLuck: 0,
      });
    }
  }

  return [...rows.values()]
    .map((row) => ({
      averageActualRank: row.averageActualRank,
      averageExpectedRank: row.averageExpectedRank,
      espnMemberId: row.espnMemberId,
      latestTeamName: row.latestTeamName,
      luckScore: row.luckScore,
      managerLabel: row.managerLabel,
      seasonsPlayed: row.seasonsPlayed,
      totalLuck: row.totalLuck,
    }))
    .sort((a, b) => {
      if (b.luckScore !== a.luckScore) return b.luckScore - a.luckScore;
      return a.managerLabel.localeCompare(b.managerLabel);
    });
}

function buildAveragePointsRanking(completedTeams, allTeams) {
  const activeMemberIds = activeEspnMemberIds(allTeams);
  const latestTeams = latestTeamByActiveMemberId(allTeams);
  const rows = new Map();

  for (const team of completedTeams) {
    if (!team.espnMemberId || !activeMemberIds.has(team.espnMemberId) || team.points === null) continue;
    const latestTeam = latestTeams.get(team.espnMemberId) ?? team;
    const existing = rows.get(team.espnMemberId) ?? {
      averagePoints: 0,
      espnMemberId: team.espnMemberId,
      latestTeamName: latestTeam.teamName,
      managerLabel: latestTeam.ownerDisplayName ?? latestTeam.teamName,
      seasonsPlayed: 0,
      totalPoints: 0,
    };

    existing.latestTeamName = latestTeam.teamName;
    existing.managerLabel = latestTeam.ownerDisplayName ?? latestTeam.teamName;
    existing.seasonsPlayed += 1;
    existing.totalPoints += team.points;
    existing.averagePoints = roundOne(existing.totalPoints / existing.seasonsPlayed);
    rows.set(team.espnMemberId, existing);
  }

  return [...rows.values()].sort((a, b) => {
    if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints;
    return a.managerLabel.localeCompare(b.managerLabel);
  });
}

function buildAccoladeRecords(teams, matchups) {
  const activeMemberIds = activeEspnMemberIds(teams);
  const teamLookup = new Map(teams.map((team) => [`${team.season}:${team.espnTeamId}`, team]));
  const scoredMatchups = matchups.filter((matchup) => matchup.homeScore !== null && matchup.awayScore !== null);
  return [
    biggestBlowoutRecord(scoredMatchups, teamLookup, activeMemberIds),
    mostPointsGameRecord(scoredMatchups, teamLookup, activeMemberIds),
    highestScoringPlayoffRunRecord(scoredMatchups, teamLookup, activeMemberIds),
  ].filter(Boolean);
}

function detectChampionships(teams) {
  const bySeason = new Map();
  for (const team of teams.filter((item) => item.finalRank && item.finalRank > 0)) {
    bySeason.set(team.season, [...(bySeason.get(team.season) ?? []), team]);
  }

  return [...bySeason.entries()].flatMap(([season, seasonTeams]) => {
    const champion = seasonTeams.find((team) => team.finalRank === 1);
    if (!champion) return [];
    const runnerUp = seasonTeams.find((team) => team.finalRank === 2) ?? null;
    return [{
      espnMemberId: champion.espnMemberId,
      espnTeamId: champion.espnTeamId,
      ownerDisplayName: champion.ownerDisplayName,
      runnerUpEspnMemberId: runnerUp?.espnMemberId ?? null,
      runnerUpEspnTeamId: runnerUp?.espnTeamId ?? null,
      runnerUpOwnerDisplayName: runnerUp?.ownerDisplayName ?? null,
      runnerUpTeamName: runnerUp?.teamName ?? null,
      season,
      teamName: champion.teamName,
    }];
  });
}

function biggestBlowoutRecord(matchups, teamLookup, activeMemberIds) {
  let best = null;

  for (const matchup of matchups) {
    if (matchup.homeScore === null || matchup.awayScore === null || !matchup.homeTeamId || !matchup.awayTeamId) {
      continue;
    }

    const home = teamLookup.get(`${matchup.season}:${matchup.homeTeamId}`);
    const away = teamLookup.get(`${matchup.season}:${matchup.awayTeamId}`);
    if (!home || !away) continue;

    const homeWon = matchup.homeScore >= matchup.awayScore;
    const winner = homeWon ? home : away;
    const loser = homeWon ? away : home;
    const winnerScore = homeWon ? matchup.homeScore : matchup.awayScore;
    const loserScore = homeWon ? matchup.awayScore : matchup.homeScore;
    if (!winner.espnMemberId || !activeMemberIds.has(winner.espnMemberId)) continue;

    const margin = roundOne(winnerScore - loserScore);
    if (margin < 0 || (best && margin <= best.value)) continue;

    best = {
      accent: "red",
      espnMemberId: winner.espnMemberId,
      holderLabel: winner.ownerDisplayName ?? winner.teamName,
      id: "biggest-blowout",
      matchupLabel: matchupLabel(matchup),
      opponentLabel: loser.ownerDisplayName ?? loser.teamName,
      scoreLine: `${formatScore(winnerScore)}-${formatScore(loserScore)}`,
      season: matchup.season,
      teamName: winner.teamName,
      title: "Biggest Blowout",
      value: margin,
      valueLabel: `${formatScore(margin)} pt margin`,
    };
  }

  return best;
}

function mostPointsGameRecord(matchups, teamLookup, activeMemberIds) {
  let best = null;

  for (const matchup of matchups) {
    for (const side of ["home", "away"]) {
      const teamId = side === "home" ? matchup.homeTeamId : matchup.awayTeamId;
      const opponentId = side === "home" ? matchup.awayTeamId : matchup.homeTeamId;
      const score = side === "home" ? matchup.homeScore : matchup.awayScore;
      const opponentScore = side === "home" ? matchup.awayScore : matchup.homeScore;
      if (!teamId || !opponentId || score === null || opponentScore === null) continue;

      const team = teamLookup.get(`${matchup.season}:${teamId}`);
      const opponent = teamLookup.get(`${matchup.season}:${opponentId}`);
      if (!team?.espnMemberId || !activeMemberIds.has(team.espnMemberId)) continue;
      if (best && score <= best.value) continue;

      best = {
        accent: "blue",
        espnMemberId: team.espnMemberId,
        holderLabel: team.ownerDisplayName ?? team.teamName,
        id: "most-points-game",
        matchupLabel: matchupLabel(matchup),
        opponentLabel: opponent?.ownerDisplayName ?? opponent?.teamName ?? null,
        scoreLine: `${formatScore(score)}-${formatScore(opponentScore)}`,
        season: matchup.season,
        teamName: team.teamName,
        title: "Most Points In A Game",
        value: score,
        valueLabel: `${formatScore(score)} pts`,
      };
    }
  }

  return best;
}

function highestScoringPlayoffRunRecord(matchups, teamLookup, activeMemberIds) {
  const runs = new Map();

  for (const matchup of matchups.filter((item) => item.playoffTierType === "WINNERS_BRACKET")) {
    for (const side of ["home", "away"]) {
      const teamId = side === "home" ? matchup.homeTeamId : matchup.awayTeamId;
      const score = side === "home" ? matchup.homeScore : matchup.awayScore;
      if (!teamId || score === null) continue;

      const team = teamLookup.get(`${matchup.season}:${teamId}`);
      if (!team?.espnMemberId || !activeMemberIds.has(team.espnMemberId)) continue;

      const key = `${matchup.season}:${team.espnMemberId}`;
      const existing = runs.get(key) ?? {
        accent: "green",
        espnMemberId: team.espnMemberId,
        games: 0,
        holderLabel: team.ownerDisplayName ?? team.teamName,
        id: "playoff-run",
        matchupLabel: `${matchup.season} playoffs`,
        opponentLabel: null,
        scoreLine: null,
        season: matchup.season,
        teamName: team.teamName,
        title: "Highest Scoring Playoff Run",
        value: 0,
        valueLabel: "",
      };

      existing.games += 1;
      existing.value = roundOne(existing.value + score);
      existing.valueLabel = `${formatScore(existing.value)} pts`;
      existing.scoreLine = `${existing.games} playoff game${existing.games === 1 ? "" : "s"}`;
      runs.set(key, existing);
    }
  }

  return [...runs.values()].sort((a, b) => b.value - a.value)[0] ?? null;
}

function activeEspnMemberIds(teams) {
  const latestSeason = maxNumber(teams.map((team) => team.season));
  if (!latestSeason) return new Set();

  return new Set(
    teams
      .filter((team) => team.season === latestSeason && team.espnMemberId)
      .map((team) => team.espnMemberId),
  );
}

function latestTeamByActiveMemberId(teams) {
  const activeIds = activeEspnMemberIds(teams);
  const latestTeams = new Map();

  for (const team of [...teams].sort((a, b) => b.season - a.season)) {
    if (team.espnMemberId && activeIds.has(team.espnMemberId) && !latestTeams.has(team.espnMemberId)) {
      latestTeams.set(team.espnMemberId, team);
    }
  }

  return latestTeams;
}

function matchupLabel(matchup) {
  if (matchup.playoffTierType && matchup.playoffTierType !== "NONE") {
    return `${matchup.season} playoffs - Week ${matchup.matchupPeriodId}`;
  }

  return `${matchup.season} Week ${matchup.matchupPeriodId}`;
}

function formatScore(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildSeasonUrl(season) {
  const params = new URLSearchParams();
  DEFAULT_VIEWS.forEach((view) => params.append("view", view));
  return `${ESPN_BASE_URL}/seasons/${season}/segments/0/leagues/${LEAGUE_ID}?${params}`;
}

function buildLegacySeasonUrl(season) {
  const params = new URLSearchParams({ seasonId: String(season) });
  DEFAULT_VIEWS.forEach((view) => params.append("view", view));
  return `${ESPN_BASE_URL}/leagueHistory/${LEAGUE_ID}?${params}`;
}

function espnFetch(url) {
  return fetch(url, {
    headers: {
      Cookie: `SWID=${SWID}; espn_s2=${ESPN_S2}`,
      "User-Agent": "League Office backend refresh",
    },
  });
}

function espnMemberDisplayName(member) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.displayName || "ESPN manager";
}

function loadDotEnv(path) {
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function statusFor(errors, completed) {
  return errors.length && completed.length ? "partial" : errors.length ? "failed" : "completed";
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function maxNumber(values) {
  return values.length ? Math.max(...values) : null;
}

function groupBy(values, keyFor) {
  const map = new Map();
  for (const value of values) {
    const key = keyFor(value);
    map.set(key, [...(map.get(key) ?? []), value]);
  }
  return map;
}

function rankTeamsByPoints(teams) {
  const ranks = new Map();
  const sortedTeams = [...teams].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  let lastPoints = null;
  let currentRank = 0;

  sortedTeams.forEach((team, index) => {
    if (lastPoints === null || team.points !== lastPoints) {
      currentRank = index + 1;
      lastPoints = team.points;
    }

    ranks.set(`${team.season}:${team.espnTeamId}`, currentRank);
  });

  return ranks;
}

function intArray(values) {
  return `array[${values.map((value) => Number.parseInt(String(value), 10)).join(",")}]::integer[]`;
}

function jsonLiteral(value) {
  return `${literal(JSON.stringify(value))}::jsonb`;
}

function nullable(value) {
  return value === null || value === undefined || value === "" ? "null" : literal(value);
}

function literal(value) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}
