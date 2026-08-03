import { describe, expect, it } from "vitest";
import { canManageMember, getMemberStatusLabel } from "@/lib/members/status";

describe("member status helpers", () => {
  it("labels active admins before standard members", () => {
    expect(
      getMemberStatusLabel({
        is_admin: true,
        is_member: true,
        revoked_at: null,
      }),
    ).toBe("Admin");
  });

  it("labels revoked access when membership is disabled", () => {
    expect(
      getMemberStatusLabel({
        is_admin: true,
        is_member: false,
        revoked_at: "2026-08-03T06:00:00.000Z",
      }),
    ).toBe("Revoked");
  });

  it("prevents admins from managing their own member row", () => {
    expect(canManageMember("member-1", "member-1")).toBe(false);
    expect(canManageMember("member-1", "member-2")).toBe(true);
  });
});
