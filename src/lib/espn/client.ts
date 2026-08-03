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
] as const;

export type EspnProbeSeasonResult = {
  availableTopLevelKeys: string[];
  draftPickCount: number | null;
  error: string | null;
  hasSchedule: boolean;
  hasSettings: boolean;
  hasTeams: boolean;
  leagueName: string | null;
  matchupsCount: number | null;
  season: number;
  status: number | null;
  teamCount: number | null;
};

export type EspnProbeResult = {
  configured: boolean;
  leagueId: string | null;
  missing: string[];
  seasons: EspnProbeSeasonResult[];
};

type EspnLeagueResponse = {
  draftDetail?: {
    picks?: unknown[];
  };
  schedule?: unknown[];
  settings?: {
    name?: string;
  };
  teams?: unknown[];
};

export function getEspnEnv() {
  const leagueId = process.env.ESPN_LEAGUE_ID?.trim() || null;
  const swid = process.env.ESPN_SWID?.trim() || null;
  const espnS2 = process.env.ESPN_S2?.trim() || null;
  const missing = [
    leagueId ? null : "ESPN_LEAGUE_ID",
    swid ? null : "ESPN_SWID",
    espnS2 ? null : "ESPN_S2",
  ].filter((value): value is string => Boolean(value));

  return {
    configured: missing.length === 0,
    espnS2,
    leagueId,
    missing,
    swid,
  };
}

export async function probeEspnLeague(seasons = getDefaultProbeSeasons()): Promise<EspnProbeResult> {
  const env = getEspnEnv();

  const { espnS2, leagueId, swid } = env;

  if (!env.configured || !leagueId || !swid || !espnS2) {
    return {
      configured: false,
      leagueId,
      missing: env.missing,
      seasons: [],
    };
  }

  const results = await Promise.all(
    seasons.map((season) => fetchSeasonSummary({
      espnS2,
      leagueId,
      season,
      swid,
    })),
  );

  return {
    configured: true,
    leagueId,
    missing: [],
    seasons: results,
  };
}

function getDefaultProbeSeasons() {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
}

async function fetchSeasonSummary({
  espnS2,
  leagueId,
  season,
  swid,
}: {
  espnS2: string;
  leagueId: string;
  season: number;
  swid: string;
}): Promise<EspnProbeSeasonResult> {
  const url = buildSeasonUrl({ leagueId, season, views: DEFAULT_VIEWS });

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Cookie: `SWID=${swid}; espn_s2=${espnS2}`,
        "User-Agent": "League Office commissioner analytics probe",
      },
    });

    if (!response.ok) {
      return emptySeasonResult({
        error: `ESPN returned ${response.status} ${response.statusText || "error"}.`,
        season,
        status: response.status,
      });
    }

    const data = (await response.json()) as EspnLeagueResponse;

    return {
      availableTopLevelKeys: Object.keys(data).sort(),
      draftPickCount: Array.isArray(data.draftDetail?.picks) ? data.draftDetail.picks.length : null,
      error: null,
      hasSchedule: Array.isArray(data.schedule),
      hasSettings: Boolean(data.settings),
      hasTeams: Array.isArray(data.teams),
      leagueName: data.settings?.name ?? null,
      matchupsCount: Array.isArray(data.schedule) ? data.schedule.length : null,
      season,
      status: response.status,
      teamCount: Array.isArray(data.teams) ? data.teams.length : null,
    };
  } catch (error) {
    return emptySeasonResult({
      error: error instanceof Error ? error.message : "Unknown ESPN fetch error.",
      season,
      status: null,
    });
  }
}

function buildSeasonUrl({
  leagueId,
  season,
  views,
}: {
  leagueId: string;
  season: number;
  views: readonly string[];
}) {
  const params = new URLSearchParams();
  views.forEach((view) => params.append("view", view));

  return `${ESPN_BASE_URL}/seasons/${season}/segments/0/leagues/${leagueId}?${params.toString()}`;
}

function emptySeasonResult({
  error,
  season,
  status,
}: {
  error: string;
  season: number;
  status: number | null;
}): EspnProbeSeasonResult {
  return {
    availableTopLevelKeys: [],
    draftPickCount: null,
    error,
    hasSchedule: false,
    hasSettings: false,
    hasTeams: false,
    leagueName: null,
    matchupsCount: null,
    season,
    status,
    teamCount: null,
  };
}
