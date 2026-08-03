"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CurrentMember = {
  id: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
};

type TargetMember = {
  display_name: string;
  id: string;
  is_member: boolean;
  revoked_at: string | null;
};

export async function setMemberAccess(formData: FormData) {
  const targetMemberId = String(formData.get("memberId") ?? "");
  const access = String(formData.get("access") ?? "");

  if (!targetMemberId || !["active", "revoked"].includes(access)) {
    throw new Error("Invalid member access update.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage members.");
  }

  const { data: actor, error: actorError } = await supabase
    .from("league_members")
    .select("id, is_member, is_admin, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<CurrentMember>();

  if (actorError || !actor?.is_admin || !actor.is_member || actor.revoked_at) {
    throw new Error("Only active admins can manage members.");
  }

  if (actor.id === targetMemberId) {
    throw new Error("Admins cannot revoke their own access.");
  }

  const { data: target, error: targetError } = await supabase
    .from("league_members")
    .select("id, display_name, is_member, revoked_at")
    .eq("id", targetMemberId)
    .maybeSingle<TargetMember>();

  if (targetError || !target) {
    throw new Error("Member not found.");
  }

  const nextAccess =
    access === "active"
      ? { is_member: true, revoked_at: null }
      : { is_member: false, revoked_at: new Date().toISOString() };

  const { error: updateError } = await supabase
    .from("league_members")
    .update(nextAccess)
    .eq("id", target.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase.from("admin_audit_events").insert({
    actor_member_id: actor.id,
    action_type: access === "active" ? "member_reactivated" : "member_revoked",
    target_id: target.id,
    target_type: "league_member",
    before_summary: {
      display_name: target.display_name,
      is_member: target.is_member,
      revoked_at: target.revoked_at,
    },
    after_summary: nextAccess,
  });

  revalidatePath("/");
}
