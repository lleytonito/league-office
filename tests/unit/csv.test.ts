import { csvEscape, rowsToCsv } from "@/lib/admin/csv";
import { describe, expect, it } from "vitest";

describe("CSV exports", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(csvEscape('Lleyton, "Commissioner"\nLeague')).toBe(
      '"Lleyton, ""Commissioner""\nLeague"',
    );
  });

  it("flattens nested rows into stable headers", () => {
    expect(
      rowsToCsv([
        {
          id: "vote-1",
          option: { label: "Yes" },
          voter: { display_name: "Lleyton" },
        },
      ]),
    ).toBe("id,option_label,voter_display_name\nvote-1,Yes,Lleyton");
  });
});
