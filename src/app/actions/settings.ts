"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type SettingsActionState = {
  message: string;
  ok: boolean;
};

const emptyState: SettingsActionState = { message: "", ok: false };

const homeActionsSchema = z.object({
  visible: z.boolean(),
});

export async function updateHomeActionsSettingAction(
  previousState: SettingsActionState = emptyState,
  formData: FormData,
): Promise<SettingsActionState> {
  void previousState;
  const supabase = await createClient();
  const actor = await getCurrentMember(supabase);

  if (!actor?.isAdmin) {
    return { message: "Only admins can update home feed actions.", ok: false };
  }

  const parsed = homeActionsSchema.safeParse({
    visible: formData.get("visible") === "on",
  });

  if (!parsed.success) {
    return { message: "Could not update the home feed actions.", ok: false };
  }

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "home_actions",
      updated_by_member_id: actor.id,
      value: { visible: parsed.data.visible },
    },
    { onConflict: "key" },
  );

  if (error) {
    return { message: error.message, ok: false };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { message: "Home feed actions updated.", ok: true };
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
    isAdmin: data.is_admin && data.is_member && !data.revoked_at,
  };
}
