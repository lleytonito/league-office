import { describe, expect, it } from "vitest";
import { memberDisplayName, memberSubtitle } from "@/lib/members/display";

describe("member display helpers", () => {
  it("uses display name as the primary identity label", () => {
    expect(memberDisplayName({ display_name: "Lleyton Ito", team_name: "The Commissioners" })).toBe(
      "Lleyton Ito",
    );
  });

  it("uses team name as the subtitle", () => {
    expect(memberSubtitle({ display_name: "Lleyton Ito", team_name: "The Commissioners" })).toBe(
      "The Commissioners",
    );
  });
});
