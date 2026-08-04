import { voteFailureMessage } from "@/lib/proposals/voting";
import { describe, expect, it } from "vitest";

describe("vote failure messages", () => {
  it("explains duplicate votes", () => {
    expect(voteFailureMessage({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(
      "You already voted on this proposal.",
    );
  });

  it("explains RLS vote blocks", () => {
    expect(voteFailureMessage({ message: 'new row violates row-level security policy for table "votes"' })).toBe(
      "Your vote was blocked by league access rules. Refresh, sign in again, and try once more.",
    );
  });

  it("keeps unknown failures generic", () => {
    expect(voteFailureMessage({ message: "connection failed" })).toBe(
      "Your vote could not be recorded. Refresh and try again.",
    );
  });
});
