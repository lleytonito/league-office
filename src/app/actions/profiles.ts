"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ProfileActionState = {
  message: string;
  ok: boolean;
};

const emptyState: ProfileActionState = { message: "", ok: false };

const profileSchema = z.object({
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  displayName: z.string().trim().min(1).max(80),
});

const adminMemberProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  teamName: z.string().trim().max(80).optional(),
});

export async function updateOwnProfileAction(
  previousState: ProfileActionState = emptyState,
  formData: FormData,
): Promise<ProfileActionState> {
  void previousState;
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (!member?.isActive) {
    return { message: "You need active league access to edit your profile.", ok: false };
  }

  const parsed = profileSchema.safeParse({
    avatarColor: stringValue(formData.get("avatarColor")) || "#183a2b",
    displayName: stringValue(formData.get("displayName")),
  });

  if (!parsed.success) {
    return { message: "Check your display name and avatar color.", ok: false };
  }

  const { error } = await supabase
    .from("league_members")
    .update({
      avatar_color: parsed.data.avatarColor,
      display_name: parsed.data.displayName,
    })
    .eq("id", member.id);

  if (error) {
    return { message: error.message, ok: false };
  }

  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath(`/members/${member.id}`);
  revalidatePath("/profile");
  return { message: "Profile updated.", ok: true };
}

export async function updateMemberProfileAction(
  previousState: ProfileActionState = emptyState,
  formData: FormData,
): Promise<ProfileActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);
  const memberId = stringValue(formData.get("memberId"));

  if (!actor?.isAdmin || !memberId) {
    return { message: "Only admins can edit member profiles.", ok: false };
  }

  const parsed = adminMemberProfileSchema.safeParse({
    displayName: stringValue(formData.get("displayName")),
    teamName: stringValue(formData.get("teamName")),
  });

  if (!parsed.success) {
    return { message: "Add a display name before saving.", ok: false };
  }

  const { error } = await supabase
    .from("league_members")
    .update({
      display_name: parsed.data.displayName,
      team_name: parsed.data.teamName || null,
    })
    .eq("id", memberId);

  if (error) {
    return { message: error.message, ok: false };
  }

  revalidateProfilePaths(memberId);
  return { message: "Member profile saved.", ok: true };
}

export async function setMemberBadgeAction(
  previousState: ProfileActionState = emptyState,
  formData: FormData,
): Promise<ProfileActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);
  const memberId = stringValue(formData.get("memberId"));
  const badgeSlug = stringValue(formData.get("badgeSlug"));
  const quantity = Number.parseInt(stringValue(formData.get("quantity")) || "0", 10);

  if (!actor?.isAdmin || !memberId || !badgeSlug) {
    return { message: "Only admins can manage badges.", ok: false };
  }

  const { data: badge, error: badgeError } = await supabase
    .from("badge_definitions")
    .select("id")
    .eq("slug", badgeSlug)
    .maybeSingle<{ id: string }>();

  if (badgeError || !badge) {
    return { message: badgeError?.message ?? "Badge not found.", ok: false };
  }

  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 99) {
    return { message: "Badge count must be between 0 and 99.", ok: false };
  }

  if (quantity === 0) {
    const { error } = await supabase
      .from("member_badges")
      .delete()
      .eq("member_id", memberId)
      .eq("badge_id", badge.id);

    if (error) {
      return { message: error.message, ok: false };
    }

    revalidateProfilePaths(memberId);
    return { message: "Badge removed.", ok: true };
  }

  const { error } = await supabase.from("member_badges").upsert(
    {
      awarded_by_member_id: actor.id,
      badge_id: badge.id,
      member_id: memberId,
      quantity,
    },
    { onConflict: "member_id,badge_id" },
  );

  if (error) {
    return { message: error.message, ok: false };
  }

  revalidateProfilePaths(memberId);
  return { message: "Badge updated.", ok: true };
}

function revalidateProfilePaths(memberId: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/profile");
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function getCurrentMember(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("league_members")
    .select("id, is_admin, is_member, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      id: string;
      is_admin: boolean;
      is_member: boolean;
      revoked_at: string | null;
    }>();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    isActive: data.is_member && !data.revoked_at,
    isAdmin: data.is_admin && data.is_member && !data.revoked_at,
  };
}
