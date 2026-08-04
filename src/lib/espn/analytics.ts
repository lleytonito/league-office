import type { EspnLeagueSeasonData, EspnTeam } from "@/lib/espn/client";

export type NormalizedEspnTeam = {
  abbreviation: string | null;
  espnMemberId: string | null;
  espnTeamId: number;
  finalRank: number | null;
  logoUrl: string | null;
  ownerDisplayName: string | null;
  playoffSeed: number | null;
  points: number | null;
  season: number;
  teamName: string;
};

export type NormalizedEspnMatchup = {
  awayScore: number | null;
  awayTeamId: number | null;
  espnMatchupId: number;
  homeScore: number | null;
  homeTeamId: number | null;
  matchupPeriodId: number;
  playoffTierType: string | null;
  season: number;
  winner: string | null;
};

export type AllTimeRankingRow = {
  averagePoints: number;
  championshipBonus: number;
  championships: number;
  espnMemberId: string | null;
  latestTeamName: string;
  managerLabel: string;
  placementPoints: number;
  runnerUpBonus: number;
  runnerUps: number;
  seasonsPlayed: number;
  totalPoints: number;
};

export type ChampionshipDetection = {
  espnMemberId: string | null;
  espnTeamId: number;
  ownerDisplayName: string | null;
  runnerUpEspnMemberId: string | null;
  runnerUpEspnTeamId: number | null;
  runnerUpOwnerDisplayName: string | null;
  runnerUpTeamName: string | null;
  season: number;
  teamName: string;
};

export type HeadToHeadSummary = {
  averageMargin: number;
  losses: number;
  pointsAgainst: number;
  pointsFor: number;
  seasons: number[];
  ties: number;
  totalMatchups: number;
  wins: number;
};

export function normalizeTeams(season: number, data: EspnLeagueSeasonData): NormalizedEspnTeam[] {
  const memberNames = new Map(
    (data.members ?? [])
      .filter((member) => member.id)
      .map((member) => [member.id as string, espnMemberDisplayName(member)]),
  );

  return (data.teams ?? []).flatMap((team) => {
    if (!Number.isFinite(team.id)) {
      return [];
    }

    const espnMemberId = primaryOwnerId(team);

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

export function normalizeMatchups(season: number, data: EspnLeagueSeasonData): NormalizedEspnMatchup[] {
  return (data.schedule ?? []).flatMap((matchup, index) => {
    const homeTeamId = positiveInteger(matchup.home?.teamId);
    const awayTeamId = positiveInteger(matchup.away?.teamId);

    if (!homeTeamId || !awayTeamId) {
      return [];
    }

    return [{
      awayScore: finiteNumber(matchup.away?.totalPoints),
      awayTeamId,
      espnMatchupId: positiveInteger(matchup.id) ?? season * 1000 + index,
      homeScore: finiteNumber(matchup.home?.totalPoints),
      homeTeamId,
      matchupPeriodId: positiveInteger(matchup.matchupPeriodId) ?? 0,
      playoffTierType: matchup.playoffTierType ?? null,
      season,
      winner: matchup.winner ?? null,
    }];
  });
}

export function buildAllTimeRanking(teams: NormalizedEspnTeam[]): AllTimeRankingRow[] {
  const completedTeams = teams.filter((team) => team.finalRank && team.finalRank > 0);
  const seasonSizes = new Map<number, number>();

  for (const team of completedTeams) {
    seasonSizes.set(team.season, Math.max(seasonSizes.get(team.season) ?? 0, team.finalRank ?? 0));
  }

  const rows = new Map<string, AllTimeRankingRow>();

  for (const team of completedTeams) {
    const key = team.espnMemberId ?? `team:${team.espnTeamId}`;
    const seasonSize = seasonSizes.get(team.season) ?? 12;
    const placementPoints = Math.max(seasonSize - (team.finalRank ?? seasonSize) + 1, 1);
    const isChampion = team.finalRank === 1;
    const isRunnerUp = team.finalRank === 2;
    const existing = rows.get(key) ?? {
      averagePoints: 0,
      championshipBonus: 0,
      championships: 0,
      espnMemberId: team.espnMemberId,
      latestTeamName: team.teamName,
      managerLabel: team.ownerDisplayName ?? team.teamName,
      placementPoints: 0,
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
    existing.averagePoints = roundOne(existing.totalPoints / existing.seasonsPlayed);
    rows.set(key, existing);
  }

  return [...rows.values()].sort((a, b) => {
    if (b.averagePoints !== a.averagePoints) {
      return b.averagePoints - a.averagePoints;
    }

    if (b.championships !== a.championships) {
      return b.championships - a.championships;
    }

    return a.managerLabel.localeCompare(b.managerLabel);
  });
}

export function detectChampionships(teams: NormalizedEspnTeam[]): ChampionshipDetection[] {
  const bySeason = new Map<number, NormalizedEspnTeam[]>();

  for (const team of teams.filter((item) => item.finalRank && item.finalRank > 0)) {
    bySeason.set(team.season, [...(bySeason.get(team.season) ?? []), team]);
  }

  return [...bySeason.entries()].flatMap(([season, seasonTeams]) => {
    const champion = seasonTeams.find((team) => team.finalRank === 1);
    if (!champion) {
      return [];
    }

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

export function buildHeadToHead(
  teamAKeys: Set<string>,
  teamBKeys: Set<string>,
  matchups: NormalizedEspnMatchup[],
): HeadToHeadSummary | null {
  const relevant = matchups.filter((matchup) => {
    const homeKey = matchup.homeTeamId ? teamSeasonKey(matchup.season, matchup.homeTeamId) : null;
    const awayKey = matchup.awayTeamId ? teamSeasonKey(matchup.season, matchup.awayTeamId) : null;
    const homeA = homeKey ? teamAKeys.has(homeKey) : false;
    const awayA = awayKey ? teamAKeys.has(awayKey) : false;
    const homeB = homeKey ? teamBKeys.has(homeKey) : false;
    const awayB = awayKey ? teamBKeys.has(awayKey) : false;
    return (homeA && awayB) || (awayA && homeB);
  });

  if (!relevant.length) {
    return null;
  }

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  const seasons = new Set<number>();

  for (const matchup of relevant) {
    const homeKey = matchup.homeTeamId ? teamSeasonKey(matchup.season, matchup.homeTeamId) : null;
    const teamAIsHome = homeKey ? teamAKeys.has(homeKey) : false;
    const scoreFor = teamAIsHome ? matchup.homeScore : matchup.awayScore;
    const scoreAgainst = teamAIsHome ? matchup.awayScore : matchup.homeScore;

    if (scoreFor === null || scoreAgainst === null) {
      continue;
    }

    pointsFor += scoreFor;
    pointsAgainst += scoreAgainst;
    seasons.add(matchup.season);

    if (scoreFor > scoreAgainst) {
      wins += 1;
    } else if (scoreFor < scoreAgainst) {
      losses += 1;
    } else {
      ties += 1;
    }
  }

  const totalMatchups = wins + losses + ties;

  if (!totalMatchups) {
    return null;
  }

  return {
    averageMargin: roundOne((pointsFor - pointsAgainst) / totalMatchups),
    losses,
    pointsAgainst: roundOne(pointsAgainst),
    pointsFor: roundOne(pointsFor),
    seasons: [...seasons].sort((a, b) => a - b),
    ties,
    totalMatchups,
    wins,
  };
}

export function teamSeasonKey(season: number, teamId: number) {
  return `${season}:${teamId}`;
}

function primaryOwnerId(team: EspnTeam) {
  return team.primaryOwner ?? team.owners?.[0] ?? null;
}

function espnMemberDisplayName(member: {
  displayName?: string;
  firstName?: string;
  lastName?: string;
}) {
  return (
    member.displayName ||
    [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
    "ESPN manager"
  );
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
