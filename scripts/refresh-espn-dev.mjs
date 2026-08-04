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

for (const season of seasons) {
  try {
    const data = await fetchSeason(season);
    const teams = normalizeTeams(season, data);
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
const champions = detectChampionships(completedTeams);
const sql = buildRefreshSql({
  champions,
  completed,
  errors,
  matchups: allMatchups,
  rankings,
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
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["supabase", "db", "query", "--linked", "--file", sqlPath], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

console.log(
  `Refreshed ${completed.length}/${seasons.length} seasons. Rankings: ${rankings.length}. Errors: ${errors.length}.`,
);

function buildRefreshSql({
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
      seasonsCompleted: completed.filter((season) => completedSeasonCandidates.includes(season)),
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

function normalizeTeams(season, data) {
  const memberNames = new Map(
    (data.members ?? [])
      .filter((member) => member.id)
      .map((member) => [member.id, espnMemberDisplayName(member)]),
  );

  return (data.teams ?? []).flatMap((team) => {
    if (!Number.isFinite(team.id)) return [];
    const espnMemberId = team.primaryOwner ?? team.owners?.[0] ?? null;
    return [{
      abbreviation: team.abbrev ?? null,
      espnMemberId,
      espnTeamId: team.id,
      finalRank: positiveInteger(team.rankCalculatedFinal) ?? positiveInteger(team.rankFinal),
      logoUrl: team.logo ?? null,
      ownerDisplayName: espnMemberId ? memberNames.get(espnMemberId) ?? null : null,
      playoffSeed: positiveInteger(team.playoffSeed),
      points: finiteNumber(team.points),
      season,
      teamName: team.name || `Team ${team.id}`,
    }];
  });
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
