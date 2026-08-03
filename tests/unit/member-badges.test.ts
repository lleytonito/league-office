import { describe, expect, it } from "vitest";
import {
  attachBadgesToMembers,
  badgesForMember,
  championBadge,
  hasChampionBadge,
  type MemberBadgeAward,
} from "@/lib/members/badges";

const awards: MemberBadgeAward[] = [
  {
    member_id: "member-1",
    quantity: 2,
    badge: {
      color: "#b8872f",
      description: "Won the league championship.",
      icon_key: "trophy",
      name: "League Champion",
      slug: "league-champion",
    },
  },
  {
    member_id: "member-2",
    quantity: 1,
    badge: {
      color: "#587246",
      description: "Top seed.",
      icon_key: "shield-check",
      name: "Regular Season Champ",
      slug: "regular-season-champ",
    },
  },
];

describe("member badge helpers", () => {
  it("hydrates only badges for the requested member", () => {
    expect(badgesForMember(awards, "member-1")).toEqual([awards[0]]);
  });

  it("attaches badges to a member directory without dropping badge-less members", () => {
    const members = attachBadgesToMembers(
      [
        { badges: [], display_name: "One", id: "member-1" },
        { badges: [], display_name: "Three", id: "member-3" },
      ],
      awards,
    );

    expect(members[0].badges).toEqual([awards[0]]);
    expect(members[1].badges).toEqual([]);
  });

  it("detects championship badge quantity without one-off profile fields", () => {
    expect(hasChampionBadge([awards[0]])).toBe(true);
    expect(championBadge([awards[0]])?.quantity).toBe(2);
    expect(hasChampionBadge([awards[1]])).toBe(false);
  });
});
