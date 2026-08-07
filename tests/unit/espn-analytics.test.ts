import {
  buildAllTimeRanking,
  buildAccoladeRecords,
  buildAveragePointsRanking,
  buildHeadToHead,
  buildLuckIndex,
  buildTeamEraSummary,
  normalizeMatchups,
  normalizeTeams,
  teamSeasonKey,
} from "@/lib/espn/analytics";
import { describe, expect, it } from "vitest";

describe("ESPN analytics", () => {
  it("prefers ESPN first and last name over username display name", () => {
    const teams = normalizeTeams(2026, {
      members: [
        {
          displayName: "fantasyUser123",
          firstName: "Lleyton",
          id: "{owner}",
          lastName: "Ito",
        },
      ],
      teams: [
        {
          id: 10,
          name: "the REAL Lleyton Ito",
          primaryOwner: "{owner}",
        },
      ],
    });

    expect(teams[0]).toMatchObject({
      ownerDisplayName: "Lleyton Ito",
      teamName: "the REAL Lleyton Ito",
    });
  });

  it("skips undecided ESPN schedule rows", () => {
    const matchups = normalizeMatchups(2026, {
      schedule: [
        {
          away: { teamId: 2, totalPoints: 0 },
          home: { teamId: 1, totalPoints: 0 },
          id: 1,
          matchupPeriodId: 1,
          winner: "UNDECIDED",
        },
      ],
    });

    expect(matchups).toHaveLength(0);
  });

  it("ranks managers with championship and runner-up bonuses", () => {
    const rankings = buildAllTimeRanking([
      team({ espnMemberId: "a", finalRank: 1, season: 2024, teamName: "Alpha" }),
      team({ espnMemberId: "b", finalRank: 2, season: 2024, teamName: "Bravo" }),
      team({ espnMemberId: "a", finalRank: 3, season: 2025, teamName: "Alpha Reloaded" }),
      team({ espnMemberId: "b", finalRank: 1, season: 2025, teamName: "Bravo" }),
    ]);

    expect(rankings[0]).toMatchObject({
      championships: 1,
      espnMemberId: "b",
      powerScore: 5.3,
      runnerUps: 1,
      totalPoints: 8,
    });
    expect(rankings[1]).toMatchObject({
      championships: 1,
      espnMemberId: "a",
      powerScore: 4.8,
      runnerUps: 0,
      totalPoints: 6,
    });
  });

  it("merges historical ESPN owner aliases into one ranking identity", () => {
    const aliases = new Map([
      ["old-owner", {
        canonicalEspnMemberId: "current-owner",
        canonicalOwnerDisplayName: "Jorden Morales",
      }],
      ["current-owner", {
        canonicalEspnMemberId: "current-owner",
        canonicalOwnerDisplayName: "Jorden Morales",
      }],
    ]);
    const oldTeams = normalizeTeams(2024, {
      members: [{ displayName: "Jorden M", id: "old-owner" }],
      teams: [{ id: 1, name: "Finding Deebo", primaryOwner: "old-owner", rankCalculatedFinal: 1 }],
    }, aliases);
    const currentTeams = normalizeTeams(2025, {
      members: [{ displayName: "Jorden M", id: "current-owner" }],
      teams: [{ id: 4, name: "Nabers In Paris", primaryOwner: "current-owner", rankCalculatedFinal: 3 }],
    }, aliases);
    const rankings = buildAllTimeRanking([...oldTeams, ...currentTeams]);

    expect(rankings).toHaveLength(1);
    expect(rankings[0]).toMatchObject({
      championships: 1,
      espnMemberId: "current-owner",
      managerLabel: "Jorden Morales",
      seasonsPlayed: 2,
    });
  });

  it("builds head-to-head using season-specific team identities", () => {
    const summary = buildHeadToHead(
      new Set([teamSeasonKey(2024, 1), teamSeasonKey(2025, 4)]),
      new Set([teamSeasonKey(2024, 2), teamSeasonKey(2025, 8)]),
      [
        matchup({ awayScore: 90, awayTeamId: 2, homeScore: 100, homeTeamId: 1, season: 2024 }),
        matchup({ awayScore: 101, awayTeamId: 8, homeScore: 99, homeTeamId: 4, season: 2025, winner: "AWAY" }),
        matchup({ awayScore: 10, awayTeamId: 3, homeScore: 20, homeTeamId: 1, season: 2025 }),
      ],
    );

    expect(summary).toMatchObject({
      losses: 1,
      pointsAgainst: 191,
      pointsFor: 199,
      totalMatchups: 2,
      wins: 1,
    });
  });

  it("builds luck index for current active teams from points rank versus final rank", () => {
    const completedTeams = [
      team({ espnMemberId: "active-a", finalRank: 4, points: 400, season: 2025, teamName: "Alpha" }),
      team({ espnMemberId: "active-b", finalRank: 1, points: 300, season: 2025, teamName: "Bravo" }),
      team({ espnMemberId: "inactive-c", finalRank: 2, points: 500, season: 2025, teamName: "Charlie" }),
      team({ espnMemberId: "active-a", finalRank: 2, points: 200, season: 2024, teamName: "Alpha Old" }),
      team({ espnMemberId: "active-b", finalRank: 3, points: 250, season: 2024, teamName: "Bravo Old" }),
    ];
    const currentTeams = [
      team({ espnMemberId: "active-a", finalRank: 0, points: 0, season: 2026, teamName: "Alpha Now" }),
      team({ espnMemberId: "active-b", finalRank: 0, points: 0, season: 2026, teamName: "Bravo Now" }),
    ];
    const luck = buildLuckIndex(completedTeams, [...completedTeams, ...currentTeams]);

    expect(luck.map((row) => row.espnMemberId)).toEqual(["active-b", "active-a"]);
    expect(luck[0]).toMatchObject({
      espnMemberId: "active-b",
      latestTeamName: "Bravo Now",
      luckScore: 0,
      seasonsPlayed: 2,
    });
    expect(luck[1]).toMatchObject({
      espnMemberId: "active-a",
      latestTeamName: "Alpha Now",
      luckScore: -1,
      seasonsPlayed: 2,
    });
  });

  it("ranks active teams by average ESPN season points", () => {
    const completedTeams = [
      team({ espnMemberId: "active-a", finalRank: 4, points: 400, season: 2025, teamName: "Alpha" }),
      team({ espnMemberId: "active-b", finalRank: 1, points: 300, season: 2025, teamName: "Bravo" }),
      team({ espnMemberId: "inactive-c", finalRank: 2, points: 900, season: 2025, teamName: "Charlie" }),
      team({ espnMemberId: "active-a", finalRank: 2, points: 200, season: 2024, teamName: "Alpha Old" }),
      team({ espnMemberId: "active-b", finalRank: 3, points: 500, season: 2024, teamName: "Bravo Old" }),
    ];
    const currentTeams = [
      team({ espnMemberId: "active-a", finalRank: 0, points: 0, season: 2026, teamName: "Alpha Now" }),
      team({ espnMemberId: "active-b", finalRank: 0, points: 0, season: 2026, teamName: "Bravo Now" }),
    ];
    const ranking = buildAveragePointsRanking(completedTeams, [...completedTeams, ...currentTeams]);

    expect(ranking.map((row) => row.espnMemberId)).toEqual(["active-b", "active-a"]);
    expect(ranking[0]).toMatchObject({
      averagePoints: 400,
      latestTeamName: "Bravo Now",
      seasonsPlayed: 2,
      totalPoints: 800,
    });
  });

  it("builds active-team accolade records from matchup history", () => {
    const teams = [
      team({ espnMemberId: "active-a", finalRank: 1, season: 2025, teamName: "Alpha" }),
      team({ espnMemberId: "active-b", finalRank: 2, season: 2025, teamName: "Bravo" }),
      team({ espnMemberId: "inactive-c", finalRank: 3, season: 2025, teamName: "Charlie" }),
      team({ espnMemberId: "active-a", finalRank: 0, season: 2026, teamName: "Alpha Now" }),
      team({ espnMemberId: "active-b", finalRank: 0, season: 2026, teamName: "Bravo Now" }),
    ];
    const records = buildAccoladeRecords(teams, [
      matchup({
        awayScore: 60,
        awayTeamId: teamIdFor("active-b"),
        homeScore: 140,
        homeTeamId: teamIdFor("active-a"),
        season: 2025,
      }),
      matchup({
        awayScore: 20,
        awayTeamId: teamIdFor("active-a"),
        homeScore: 200,
        homeTeamId: teamIdFor("inactive-c"),
        season: 2025,
      }),
      matchup({
        awayScore: 130,
        awayTeamId: teamIdFor("active-b"),
        homeScore: 120,
        homeTeamId: teamIdFor("active-a"),
        playoffTierType: "WINNERS_BRACKET",
        season: 2025,
        winner: "AWAY",
      }),
    ]);

    expect(records.map((record) => record.id).sort()).toEqual([
      "biggest-blowout",
      "most-points-game",
      "playoff-run",
    ]);
    expect(records.find((record) => record.id === "biggest-blowout")).toMatchObject({
      espnMemberId: "active-a",
      value: 80,
    });
    expect(records.find((record) => record.id === "most-points-game")).toMatchObject({
      espnMemberId: "active-a",
      value: 140,
    });
    expect(records.find((record) => record.id === "playoff-run")).toMatchObject({
      gameScores: [{ label: "Final", scoreLabel: "130", week: 1 }],
      espnMemberId: "active-b",
      title: "Best Playoff Run",
      value: 130,
    });
  });

  it("builds a team era summary with favorite active opponent", () => {
    const targetTeams = [
      team({ espnMemberId: "target", finalRank: 1, season: 2024, teamName: "Target Old" }),
      team({ espnMemberId: "target", finalRank: 5, season: 2025, teamName: "Target Now" }),
    ];
    const activeOpponent = team({ espnMemberId: "opponent", finalRank: 4, season: 2025, teamName: "Opponent Now" });
    const inactiveOpponent = team({ espnMemberId: "inactive", finalRank: 2, season: 2024, teamName: "Inactive" });
    const summary = buildTeamEraSummary({
      allTeams: [...targetTeams, activeOpponent, inactiveOpponent],
      matchups: [
        matchup({ awayScore: 90, awayTeamId: 2, homeScore: 110, homeTeamId: 1, season: 2025 }),
        matchup({ awayScore: 120, awayTeamId: 3, homeScore: 90, homeTeamId: 1, season: 2024, winner: "AWAY" }),
      ],
      targetTeams,
    });

    expect(summary).toMatchObject({
      averageFinish: 3,
      championships: 1,
      seasonsPlayed: 2,
    });
    expect(summary.bestSeason).toMatchObject({ finalRank: 1, season: 2024 });
    expect(summary.worstSeason).toMatchObject({ finalRank: 5, season: 2025 });
    expect(summary.favoriteOpponent).toMatchObject({
      managerLabel: "Manager B",
      totalMatchups: 1,
      wins: 1,
    });
  });
});

function team(overrides: {
  espnMemberId: string;
  finalRank: number;
  points?: number;
  season: number;
  teamName: string;
}) {
  return {
    abbreviation: null,
    espnMemberId: overrides.espnMemberId,
    espnTeamId: teamIdFor(overrides.espnMemberId),
    finalRank: overrides.finalRank,
    logoUrl: null,
    ownerDisplayName: overrides.espnMemberId === "a" ? "Manager A" : "Manager B",
    playoffSeed: null,
    points: overrides.points ?? null,
    season: overrides.season,
    teamName: overrides.teamName,
  };
}

function teamIdFor(espnMemberId: string) {
  return {
    "active-a": 1,
    "active-b": 2,
    inactive: 3,
    "inactive-c": 3,
    opponent: 2,
    target: 1,
  }[espnMemberId] ?? (espnMemberId === "a" ? 1 : 2);
}

function matchup(overrides: {
  awayScore: number;
  awayTeamId: number;
  homeScore: number;
  homeTeamId: number;
  playoffTierType?: string | null;
  season: number;
  winner?: string;
}) {
  return {
    awayScore: overrides.awayScore,
    awayTeamId: overrides.awayTeamId,
    espnMatchupId: overrides.season,
    homeScore: overrides.homeScore,
    homeTeamId: overrides.homeTeamId,
    matchupPeriodId: 1,
    playoffTierType: overrides.playoffTierType ?? null,
    season: overrides.season,
    winner: overrides.winner ?? "HOME",
  };
}
