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

export type EspnIdentityAlias = {
  canonicalEspnMemberId: string;
  canonicalOwnerDisplayName: string;
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
  championshipBonus: number;
  championships: number;
  espnMemberId: string | null;
  latestTeamName: string;
  managerLabel: string;
  placementPoints: number;
  powerScore: number;
  runnerUpBonus: number;
  runnerUps: number;
  seasonsPlayed: number;
  totalPoints: number;
};

export type LuckIndexRow = {
  averageActualRank: number | null;
  averageExpectedRank: number | null;
  espnMemberId: string;
  latestTeamName: string;
  luckScore: number;
  managerLabel: string;
  seasonsPlayed: number;
  totalLuck: number;
};

export type AveragePointsRow = {
  averagePoints: number;
  espnMemberId: string;
  latestTeamName: string;
  managerLabel: string;
  seasonsPlayed: number;
  totalPoints: number;
};

export type AccoladeRecord = {
  accent: "blue" | "bronze" | "gold" | "green" | "red" | "violet";
  espnMemberId: string;
  gameScores?: Array<{
    label: string;
    scoreLabel: string;
    week: number;
  }>;
  holderLabel: string;
  id: "biggest-blowout" | "most-points-game" | "playoff-run";
  matchupLabel: string;
  opponentLabel: string | null;
  scoreLine: string | null;
  season: number;
  teamName: string;
  title: string;
  value: number;
  valueLabel: string;
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

export type TeamEraSummary = {
  averageFinish: number | null;
  bestSeason: TeamEraSeason | null;
  championships: number;
  favoriteOpponent: TeamEraFavoriteOpponent | null;
  runnerUps: number;
  seasonsPlayed: number;
  worstSeason: TeamEraSeason | null;
};

export type TeamEraSeason = {
  finalRank: number;
  season: number;
  teamName: string;
};

export type TeamEraFavoriteOpponent = {
  averageMargin: number;
  espnMemberId: string;
  losses: number;
  managerLabel: string;
  pointsFor: number;
  teamName: string;
  ties: number;
  totalMatchups: number;
  winPercentage: number;
  wins: number;
};

export function normalizeTeams(
  season: number,
  data: EspnLeagueSeasonData,
  aliases = new Map<string, EspnIdentityAlias>(),
): NormalizedEspnTeam[] {
  const memberNames = new Map(
    (data.members ?? [])
      .filter((member) => member.id)
      .map((member) => [member.id as string, espnMemberDisplayName(member)]),
  );

  return (data.teams ?? []).flatMap((team) => {
    if (!Number.isFinite(team.id)) {
      return [];
    }

    const rawEspnMemberId = primaryOwnerId(team);
    const alias = rawEspnMemberId ? aliases.get(rawEspnMemberId) : null;
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

export function normalizeMatchups(season: number, data: EspnLeagueSeasonData): NormalizedEspnMatchup[] {
  return (data.schedule ?? []).flatMap((matchup, index) => {
    const homeTeamId = positiveInteger(matchup.home?.teamId);
    const awayTeamId = positiveInteger(matchup.away?.teamId);
    const winner = matchup.winner ?? null;

    if (!homeTeamId || !awayTeamId || !winner || winner === "UNDECIDED") {
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
      winner,
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
    existing.powerScore = stabilizedPowerScore(existing.totalPoints, existing.seasonsPlayed);
    rows.set(key, existing);
  }

  return [...rows.values()].sort((a, b) => {
    if (b.powerScore !== a.powerScore) {
      return b.powerScore - a.powerScore;
    }

    if (b.championships !== a.championships) {
      return b.championships - a.championships;
    }

    return a.managerLabel.localeCompare(b.managerLabel);
  });
}

export function buildLuckIndex(
  completedTeamRows: NormalizedEspnTeam[],
  allTeamRows = completedTeamRows,
): LuckIndexRow[] {
  const latestSeason = maxNumber(allTeamRows.map((team) => team.season));
  if (!latestSeason) {
    return [];
  }

  const activeTeams = allTeamRows.filter((team) => team.season === latestSeason && team.espnMemberId);
  const activeEspnMemberIds = new Set(activeTeams.map((team) => team.espnMemberId as string));
  const latestTeamByMemberId = new Map(
    activeTeams.map((team) => [team.espnMemberId as string, team]),
  );
  const rows = new Map<string, LuckIndexRow & { actualRankTotal: number; expectedRankTotal: number }>();
  const completedTeams = completedTeamRows.filter(
    (team) => team.finalRank && team.finalRank > 0 && team.points !== null,
  );
  const completedActiveTeams = completedTeams.filter(
    (team) =>
      team.espnMemberId &&
      activeEspnMemberIds.has(team.espnMemberId),
  );
  const teamsBySeason = groupBy(completedTeams, (team) => team.season);

  for (const seasonTeams of teamsBySeason.values()) {
    const pointsRanks = rankTeamsByPoints(seasonTeams);

    for (const team of seasonTeams.filter((item) => completedActiveTeams.includes(item))) {
      const espnMemberId = team.espnMemberId as string;
      const expectedRank = pointsRanks.get(teamSeasonKey(team.season, team.espnTeamId));
      const actualRank = team.finalRank;

      if (!expectedRank || !actualRank) {
        continue;
      }

      const latestTeam = latestTeamByMemberId.get(espnMemberId) ?? team;
      const existing = rows.get(espnMemberId) ?? {
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
      rows.set(espnMemberId, existing);
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
      if (b.luckScore !== a.luckScore) {
        return b.luckScore - a.luckScore;
      }

      return a.managerLabel.localeCompare(b.managerLabel);
    });
}

export function buildAveragePointsRanking(
  completedTeamRows: NormalizedEspnTeam[],
  allTeamRows = completedTeamRows,
): AveragePointsRow[] {
  const activeMemberIds = activeEspnMemberIds(allTeamRows);
  const latestTeams = latestTeamByActiveMemberId(allTeamRows);
  const rows = new Map<string, AveragePointsRow>();

  for (const team of completedTeamRows) {
    if (!team.espnMemberId || !activeMemberIds.has(team.espnMemberId) || team.points === null) {
      continue;
    }

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
    if (b.averagePoints !== a.averagePoints) {
      return b.averagePoints - a.averagePoints;
    }

    return a.managerLabel.localeCompare(b.managerLabel);
  });
}

export function buildAccoladeRecords(
  teams: NormalizedEspnTeam[],
  matchups: NormalizedEspnMatchup[],
): AccoladeRecord[] {
  const activeMemberIds = activeEspnMemberIds(teams);
  const teamLookup = new Map(teams.map((team) => [teamSeasonKey(team.season, team.espnTeamId), team]));
  const scoredMatchups = matchups.filter(
    (matchup) => matchup.homeScore !== null && matchup.awayScore !== null,
  );
  const records = [
    biggestBlowoutRecord(scoredMatchups, teamLookup, activeMemberIds),
    mostPointsGameRecord(scoredMatchups, teamLookup, activeMemberIds),
    highestScoringPlayoffRunRecord(scoredMatchups, teamLookup, activeMemberIds),
  ];

  return records.filter((record): record is AccoladeRecord => Boolean(record));
}

export function buildTeamEraSummary({
  allTeams = [],
  matchups = [],
  targetTeams,
}: {
  allTeams?: NormalizedEspnTeam[];
  matchups?: NormalizedEspnMatchup[];
  targetTeams: NormalizedEspnTeam[];
}): TeamEraSummary {
  const completedTeams = targetTeams
    .filter((team) => team.finalRank && team.finalRank > 0)
    .sort((a, b) => b.season - a.season);
  const seasonsPlayed = completedTeams.length;
  const best = completedTeams.reduce<NormalizedEspnTeam | null>(
    (current, team) => (!current || (team.finalRank ?? 99) < (current.finalRank ?? 99) ? team : current),
    null,
  );
  const worst = completedTeams.reduce<NormalizedEspnTeam | null>(
    (current, team) => (!current || (team.finalRank ?? 0) > (current.finalRank ?? 0) ? team : current),
    null,
  );
  const finishTotal = completedTeams.reduce((total, team) => total + (team.finalRank ?? 0), 0);

  return {
    averageFinish: seasonsPlayed ? roundOne(finishTotal / seasonsPlayed) : null,
    bestSeason: best ? teamEraSeason(best) : null,
    championships: completedTeams.filter((team) => team.finalRank === 1).length,
    favoriteOpponent: buildFavoriteOpponent(targetTeams, allTeams, matchups),
    runnerUps: completedTeams.filter((team) => team.finalRank === 2).length,
    seasonsPlayed,
    worstSeason: worst ? teamEraSeason(worst) : null,
  };
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

    if (matchup.winner === "TIE") {
      ties += 1;
    } else if (
      (teamAIsHome && matchup.winner === "HOME") ||
      (!teamAIsHome && matchup.winner === "AWAY")
    ) {
      wins += 1;
    } else if (matchup.winner === "HOME" || matchup.winner === "AWAY") {
      losses += 1;
    } else if (scoreFor > scoreAgainst) {
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
    [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
    member.displayName ||
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

function maxNumber(values: number[]) {
  return values.length ? Math.max(...values) : null;
}

function activeEspnMemberIds(teams: NormalizedEspnTeam[]) {
  const latestSeason = maxNumber(teams.map((team) => team.season));
  if (!latestSeason) {
    return new Set<string>();
  }

  return new Set(
    teams
      .filter((team) => team.season === latestSeason && team.espnMemberId)
      .map((team) => team.espnMemberId as string),
  );
}

function latestTeamByActiveMemberId(teams: NormalizedEspnTeam[]) {
  const activeIds = activeEspnMemberIds(teams);
  const latestTeams = new Map<string, NormalizedEspnTeam>();

  for (const team of [...teams].sort((a, b) => b.season - a.season)) {
    if (team.espnMemberId && activeIds.has(team.espnMemberId) && !latestTeams.has(team.espnMemberId)) {
      latestTeams.set(team.espnMemberId, team);
    }
  }

  return latestTeams;
}

function stabilizedPowerScore(totalPoints: number, seasonsPlayed: number) {
  const baselineAverage = 6.5;
  const priorSeasons = 2;
  return roundOne((totalPoints + baselineAverage * priorSeasons) / (seasonsPlayed + priorSeasons));
}

function groupBy<T, K>(values: T[], keyFor: (value: T) => K) {
  const map = new Map<K, T[]>();

  for (const value of values) {
    const key = keyFor(value);
    map.set(key, [...(map.get(key) ?? []), value]);
  }

  return map;
}

function rankTeamsByPoints(teams: NormalizedEspnTeam[]) {
  const ranks = new Map<string, number>();
  const sortedTeams = [...teams].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  let lastPoints: number | null = null;
  let currentRank = 0;

  sortedTeams.forEach((team, index) => {
    if (lastPoints === null || team.points !== lastPoints) {
      currentRank = index + 1;
      lastPoints = team.points;
    }

    ranks.set(teamSeasonKey(team.season, team.espnTeamId), currentRank);
  });

  return ranks;
}

function teamEraSeason(team: NormalizedEspnTeam): TeamEraSeason {
  return {
    finalRank: team.finalRank as number,
    season: team.season,
    teamName: team.teamName,
  };
}

function buildFavoriteOpponent(
  targetTeams: NormalizedEspnTeam[],
  allTeams: NormalizedEspnTeam[],
  matchups: NormalizedEspnMatchup[],
): TeamEraFavoriteOpponent | null {
  if (!targetTeams.length || !allTeams.length || !matchups.length) {
    return null;
  }

  const targetEspnMemberId = targetTeams[0]?.espnMemberId;
  const latestSeason = maxNumber(allTeams.map((team) => team.season));
  const targetKeys = new Set(targetTeams.map((team) => teamSeasonKey(team.season, team.espnTeamId)));
  const activeTeams = allTeams.filter(
    (team) => team.season === latestSeason && team.espnMemberId && team.espnMemberId !== targetEspnMemberId,
  );
  const candidates = activeTeams.flatMap((activeTeam) => {
    const opponentTeams = allTeams.filter((team) => team.espnMemberId === activeTeam.espnMemberId);
    const opponentKeys = new Set(opponentTeams.map((team) => teamSeasonKey(team.season, team.espnTeamId)));
    const h2h = buildHeadToHead(targetKeys, opponentKeys, matchups);

    if (!h2h || !h2h.totalMatchups) {
      return [];
    }

    return [{
      averageMargin: h2h.averageMargin,
      espnMemberId: activeTeam.espnMemberId as string,
      losses: h2h.losses,
      managerLabel: activeTeam.ownerDisplayName ?? activeTeam.teamName,
      pointsFor: h2h.pointsFor,
      teamName: activeTeam.teamName,
      ties: h2h.ties,
      totalMatchups: h2h.totalMatchups,
      winPercentage: roundOne(((h2h.wins + h2h.ties * 0.5) / h2h.totalMatchups) * 100),
      wins: h2h.wins,
    }];
  });

  return candidates.sort((a, b) => {
    if (b.winPercentage !== a.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (b.averageMargin !== a.averageMargin) {
      return b.averageMargin - a.averageMargin;
    }

    return a.managerLabel.localeCompare(b.managerLabel);
  })[0] ?? null;
}

function biggestBlowoutRecord(
  matchups: NormalizedEspnMatchup[],
  teamLookup: Map<string, NormalizedEspnTeam>,
  activeMemberIds: Set<string>,
) {
  let best: AccoladeRecord | null = null;

  for (const matchup of matchups) {
    if (matchup.homeScore === null || matchup.awayScore === null || !matchup.homeTeamId || !matchup.awayTeamId) {
      continue;
    }

    const home = teamLookup.get(teamSeasonKey(matchup.season, matchup.homeTeamId));
    const away = teamLookup.get(teamSeasonKey(matchup.season, matchup.awayTeamId));
    if (!home || !away) {
      continue;
    }

    const homeWon = matchup.homeScore >= matchup.awayScore;
    const winner = homeWon ? home : away;
    const loser = homeWon ? away : home;
    const winnerScore = homeWon ? matchup.homeScore : matchup.awayScore;
    const loserScore = homeWon ? matchup.awayScore : matchup.homeScore;
    if (!winner.espnMemberId || !activeMemberIds.has(winner.espnMemberId)) {
      continue;
    }

    const margin = roundOne(winnerScore - loserScore);
    if (margin < 0 || (best && margin <= best.value)) {
      continue;
    }

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

function mostPointsGameRecord(
  matchups: NormalizedEspnMatchup[],
  teamLookup: Map<string, NormalizedEspnTeam>,
  activeMemberIds: Set<string>,
) {
  let best: AccoladeRecord | null = null;

  for (const matchup of matchups) {
    for (const side of ["home", "away"] as const) {
      const teamId = side === "home" ? matchup.homeTeamId : matchup.awayTeamId;
      const opponentId = side === "home" ? matchup.awayTeamId : matchup.homeTeamId;
      const score = side === "home" ? matchup.homeScore : matchup.awayScore;
      const opponentScore = side === "home" ? matchup.awayScore : matchup.homeScore;
      if (!teamId || !opponentId || score === null || opponentScore === null) {
        continue;
      }

      const team = teamLookup.get(teamSeasonKey(matchup.season, teamId));
      const opponent = teamLookup.get(teamSeasonKey(matchup.season, opponentId));
      if (!team?.espnMemberId || !activeMemberIds.has(team.espnMemberId)) {
        continue;
      }

      if (best && score <= best.value) {
        continue;
      }

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

function highestScoringPlayoffRunRecord(
  matchups: NormalizedEspnMatchup[],
  teamLookup: Map<string, NormalizedEspnTeam>,
  activeMemberIds: Set<string>,
) {
  const runs = new Map<string, AccoladeRecord & { games: number; rawGameScores: Array<{ score: number; week: number }> }>();

  for (const matchup of matchups.filter((item) => item.playoffTierType === "WINNERS_BRACKET")) {
    for (const side of ["home", "away"] as const) {
      const teamId = side === "home" ? matchup.homeTeamId : matchup.awayTeamId;
      const score = side === "home" ? matchup.homeScore : matchup.awayScore;
      if (!teamId || score === null) {
        continue;
      }

      const team = teamLookup.get(teamSeasonKey(matchup.season, teamId));
      if (!team?.espnMemberId || !activeMemberIds.has(team.espnMemberId)) {
        continue;
      }

      const key = `${matchup.season}:${team.espnMemberId}`;
      const existing = runs.get(key) ?? {
        accent: "violet",
        espnMemberId: team.espnMemberId,
        games: 0,
        rawGameScores: [],
        holderLabel: team.ownerDisplayName ?? team.teamName,
        id: "playoff-run",
        matchupLabel: `${matchup.season} playoffs`,
        opponentLabel: null,
        scoreLine: null,
        season: matchup.season,
        teamName: team.teamName,
        title: "Best Playoff Run",
        value: 0,
        valueLabel: "",
      };

      existing.games += 1;
      existing.value = roundOne(existing.value + score);
      existing.valueLabel = `${formatScore(existing.value)} pts`;
      existing.scoreLine = `${existing.games} playoff game${existing.games === 1 ? "" : "s"}`;
      existing.rawGameScores.push({ score, week: matchup.matchupPeriodId });
      runs.set(key, existing);
    }
  }

  return (
    [...runs.values()]
      .map(({ rawGameScores, ...run }) => {
        const { games, ...record } = run;
        void games;
        const sortedScores = [...rawGameScores].sort((a, b) => a.week - b.week);
        return {
          ...record,
          gameScores: playoffRoundLabels(sortedScores.length).map((label, index) => ({
            label,
            scoreLabel: formatScore(sortedScores[index]?.score ?? 0),
            week: sortedScores[index]?.week ?? index + 1,
          })),
        };
      })
      .sort((a, b) => b.value - a.value)[0] ?? null
  );
}

function playoffRoundLabels(count: number) {
  if (count === 3) {
    return ["R1", "SF", "Final"];
  }

  if (count === 2) {
    return ["SF", "Final"];
  }

  if (count === 1) {
    return ["Final"];
  }

  return Array.from({ length: count }, (_, index) => (index === count - 1 ? "Final" : `G${index + 1}`));
}

function matchupLabel(matchup: NormalizedEspnMatchup) {
  if (matchup.playoffTierType && matchup.playoffTierType !== "NONE") {
    return `${matchup.season} playoffs - Week ${matchup.matchupPeriodId}`;
  }

  return `${matchup.season} Week ${matchup.matchupPeriodId}`;
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
