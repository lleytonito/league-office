import { buildAllTimeRanking, buildHeadToHead, teamSeasonKey } from "@/lib/espn/analytics";
import { describe, expect, it } from "vitest";

describe("ESPN analytics", () => {
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
      runnerUps: 1,
      totalPoints: 8,
    });
    expect(rankings[1]).toMatchObject({
      championships: 1,
      espnMemberId: "a",
      runnerUps: 0,
      totalPoints: 6,
    });
  });

  it("builds head-to-head using season-specific team identities", () => {
    const summary = buildHeadToHead(
      new Set([teamSeasonKey(2024, 1), teamSeasonKey(2025, 4)]),
      new Set([teamSeasonKey(2024, 2), teamSeasonKey(2025, 8)]),
      [
        matchup({ awayScore: 90, awayTeamId: 2, homeScore: 100, homeTeamId: 1, season: 2024 }),
        matchup({ awayScore: 101, awayTeamId: 8, homeScore: 99, homeTeamId: 4, season: 2025 }),
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
});

function team(overrides: {
  espnMemberId: string;
  finalRank: number;
  season: number;
  teamName: string;
}) {
  return {
    abbreviation: null,
    espnMemberId: overrides.espnMemberId,
    espnTeamId: overrides.espnMemberId === "a" ? 1 : 2,
    finalRank: overrides.finalRank,
    logoUrl: null,
    playoffSeed: null,
    points: null,
    season: overrides.season,
    teamName: overrides.teamName,
  };
}

function matchup(overrides: {
  awayScore: number;
  awayTeamId: number;
  homeScore: number;
  homeTeamId: number;
  season: number;
}) {
  return {
    awayScore: overrides.awayScore,
    awayTeamId: overrides.awayTeamId,
    espnMatchupId: overrides.season,
    homeScore: overrides.homeScore,
    homeTeamId: overrides.homeTeamId,
    matchupPeriodId: 1,
    playoffTierType: null,
    season: overrides.season,
    winner: "HOME",
  };
}
