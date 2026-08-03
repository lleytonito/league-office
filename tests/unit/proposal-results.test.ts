import { closedResultText } from "@/lib/proposals/results";
import { describe, expect, it } from "vitest";

describe("closed proposal result text", () => {
  it("names the winning option when a proposal passes", () => {
    expect(
      closedResultText(
        [
          { label: "1 Point per 25 Kickoff Yards", count: 7 },
          { label: "Keep current scoring", count: 5 },
        ],
        true,
        12,
      ),
    ).toBe("1 Point per 25 Kickoff Yards has passed.");
  });

  it("fails ties without naming a winner", () => {
    expect(
      closedResultText(
        [
          { label: "Yes", count: 6 },
          { label: "No", count: 6 },
        ],
        false,
        12,
      ),
    ).toBe("Vote failed: no option won outright.");
  });
});
