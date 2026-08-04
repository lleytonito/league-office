import { buildAllTimeRanking, buildHeadToHead, normalizeMatchups, normalizeTeams, teamSeasonKey } from "@/lib/espn/analytics";
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
    ownerDisplayName: overrides.espnMemberId === "a" ? "Manager A" : "Manager B",
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
  winner?: string;
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
    winner: overrides.winner ?? "HOME",
  };
}
