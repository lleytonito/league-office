"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ProposalActionState = {
  message: string;
  ok: boolean;
};

const emptyState: ProposalActionState = { message: "", ok: false };

const proposalSchema = z.object({
  rationale: z.string().trim().max(4000).optional(),
  summary: z.string().trim().max(4000),
  title: z.string().trim().min(1).max(140),
});

const announcementSchema = z.object({
  body: z.string().trim().min(10).max(4000),
  isPinned: z.boolean(),
  title: z.string().trim().min(4).max(140),
});

export async function submitProposalAction(
  previousState: ProposalActionState = emptyState,
  formData: FormData,
): Promise<ProposalActionState> {
  void previousState;
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (!member?.isActive) {
    return { message: "Sign in as an active league member to submit a proposal.", ok: false };
  }

  const parsed = proposalSchema.safeParse({
    rationale: stringValue(formData.get("rationale")),
    summary: stringValue(formData.get("summary")),
    title: stringValue(formData.get("title")),
  });
  const options = optionValues(formData);

  if (!parsed.success) {
    return { message: "Add a proposal title.", ok: false };
  }

  if (options.length < 2) {
    return { message: "Add at least two voting options.", ok: false };
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      author_member_id: member.id,
      rationale: parsed.data.rationale || null,
      status: "review",
      summary: parsed.data.summary,
      title: parsed.data.title,
    })
    .select("id")
    .single<{ id: string }>();

  if (proposalError || !proposal) {
    return { message: proposalError?.message ?? "Could not submit proposal.", ok: false };
  }

  const { error: optionsError } = await supabase.from("proposal_vote_options").insert(
    options.map((label, index) => ({
      label,
      proposal_id: proposal.id,
      sort_order: index,
    })),
  );

  if (optionsError) {
    return { message: optionsError.message, ok: false };
  }

  revalidatePath("/");
  return { message: "Proposal sent to commissioner review.", ok: true };
}

export async function createAnnouncementAction(
  previousState: ProposalActionState = emptyState,
  formData: FormData,
): Promise<ProposalActionState> {
  void previousState;
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (!member?.isAdmin) {
    return { message: "Only admins can publish feed posts.", ok: false };
  }

  const parsed = announcementSchema.safeParse({
    body: stringValue(formData.get("body")),
    isPinned: formData.get("isPinned") === "on",
    title: stringValue(formData.get("title")),
  });

  if (!parsed.success) {
    return { message: "Add a title and body for the post.", ok: false };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("feed_announcements").insert({
    author_member_id: member.id,
    body: parsed.data.body,
    is_pinned: parsed.data.isPinned,
    pinned_at: parsed.data.isPinned ? now : null,
    published_at: now,
    title: parsed.data.title,
  });

  if (error) {
    return { message: error.message, ok: false };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { message: "Pinned feed post published.", ok: true };
}

export async function updateAnnouncementAction(
  previousState: ProposalActionState = emptyState,
  formData: FormData,
): Promise<ProposalActionState> {
  void previousState;
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (!member?.isAdmin) {
    return { message: "Only admins can edit feed posts.", ok: false };
  }

  const announcementId = stringValue(formData.get("announcementId"));
  const isPublished = formData.get("isPublished") === "on";
  const parsed = announcementSchema.safeParse({
    body: stringValue(formData.get("body")),
    isPinned: formData.get("isPinned") === "on",
    title: stringValue(formData.get("title")),
  });

  if (!announcementId || !parsed.success) {
    return { message: "Add a title and body for the post.", ok: false };
  }

  const { error } = await supabase
    .from("feed_announcements")
    .update({
      body: parsed.data.body,
      is_pinned: parsed.data.isPinned,
      pinned_at: parsed.data.isPinned ? new Date().toISOString() : null,
      published_at: isPublished ? new Date().toISOString() : null,
      title: parsed.data.title,
    })
    .eq("id", announcementId);

  if (error) {
    return { message: error.message, ok: false };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { message: "Feed post updated.", ok: true };
}

export async function deleteAnnouncementAction(formData: FormData) {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);
  const announcementId = stringValue(formData.get("announcementId"));

  if (!member?.isAdmin || !announcementId) {
    return;
  }

  await supabase.from("feed_announcements").delete().eq("id", announcementId);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function approveProposalAction(
  previousState: ProposalActionState = emptyState,
  formData: FormData,
): Promise<ProposalActionState> {
  void previousState;
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);

  if (!member?.isAdmin) {
    return { message: "Only admins can approve proposals.", ok: false };
  }

  const proposalId = stringValue(formData.get("proposalId"));
  const closesAt = stringValue(formData.get("closesAt"));
  const isPinned = formData.get("isPinned") === "on";
  const parsed = proposalSchema.safeParse({
    rationale: stringValue(formData.get("rationale")),
    summary: stringValue(formData.get("summary")),
    title: stringValue(formData.get("title")),
  });
  const options = optionValues(formData);

  if (!proposalId || !parsed.success || options.length < 2) {
    return { message: "Proposal title and at least two options are required.", ok: false };
  }

  const deadline = closesAt ? new Date(closesAt) : defaultVotingDeadline();
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    return { message: "Choose a future voting deadline.", ok: false };
  }

  const now = new Date().toISOString();
  const { error: proposalError } = await supabase
    .from("proposals")
    .update({
      is_pinned: isPinned,
      pinned_at: isPinned ? now : null,
      published_at: now,
      rationale: parsed.data.rationale || null,
      reviewed_at: now,
      reviewed_by_member_id: member.id,
      status: "voting",
      summary: parsed.data.summary,
      title: parsed.data.title,
      voting_closes_at: deadline.toISOString(),
    })
    .eq("id", proposalId);

  if (proposalError) {
    return { message: proposalError.message, ok: false };
  }

  const { error: deleteError } = await supabase
    .from("proposal_vote_options")
    .delete()
    .eq("proposal_id", proposalId);

  if (deleteError) {
    return { message: deleteError.message, ok: false };
  }

  const { error: optionError } = await supabase.from("proposal_vote_options").insert(
    options.map((label, index) => ({
      label,
      proposal_id: proposalId,
      sort_order: index,
    })),
  );

  if (optionError) {
    return { message: optionError.message, ok: false };
  }

  const { error: windowError } = await supabase.from("voting_windows").upsert(
    {
      created_by_member_id: member.id,
      ends_at: deadline.toISOString(),
      proposal_id: proposalId,
      starts_at: now,
    },
    { onConflict: "proposal_id" },
  );

  if (windowError) {
    return { message: windowError.message, ok: false };
  }

  await supabase.from("proposal_status_history").insert({
    actor_member_id: member.id,
    note: "Approved for voting",
    proposal_id: proposalId,
    to_status: "voting",
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return { message: "Proposal approved and opened for voting.", ok: true };
}

export async function rejectProposalAction(formData: FormData) {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);
  const proposalId = stringValue(formData.get("proposalId"));

  if (!member?.isAdmin || !proposalId) {
    return;
  }

  await supabase
    .from("proposals")
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by_member_id: member.id,
      status: "rejected",
    })
    .eq("id", proposalId);

  await supabase.from("proposal_status_history").insert({
    actor_member_id: member.id,
    note: "Rejected during commissioner review",
    proposal_id: proposalId,
    to_status: "rejected",
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteProposalAction(formData: FormData) {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);
  const proposalId = stringValue(formData.get("proposalId"));

  if (!member?.isAdmin || !proposalId) {
    return;
  }

  await supabase.from("proposals").delete().eq("id", proposalId);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function closeVotingAction(formData: FormData) {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);
  const proposalId = stringValue(formData.get("proposalId"));

  if (!member?.isAdmin || !proposalId) {
    return;
  }

  const { data: votes } = await supabase
    .from("votes")
    .select("option_id")
    .eq("proposal_id", proposalId)
    .returns<Array<{ option_id: string }>>();

  const counts = new Map<string, number>();
  for (const vote of votes ?? []) {
    counts.set(vote.option_id, (counts.get(vote.option_id) ?? 0) + 1);
  }

  const totalVotes = votes?.length ?? 0;
  const topCount = Math.max(0, ...counts.values());
  const topOptionCount = [...counts.values()].filter((count) => count === topCount).length;
  const passed = totalVotes > 0 && topCount > totalVotes / 2 && topOptionCount === 1;
  const now = new Date().toISOString();

  await supabase
    .from("proposals")
    .update({ closed_at: now, passed, status: "closed" })
    .eq("id", proposalId);

  await supabase
    .from("voting_windows")
    .update({ closed_at: now })
    .eq("proposal_id", proposalId);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function toggleProposalPinAction(formData: FormData) {
  const supabase = await createClient();
  const member = await getCurrentMember(supabase);
  const proposalId = stringValue(formData.get("proposalId"));
  const shouldPin = formData.get("shouldPin") === "true";

  if (!member?.isAdmin || !proposalId) {
    return;
  }

  await supabase
    .from("proposals")
    .update({
      is_pinned: shouldPin,
      pinned_at: shouldPin ? new Date().toISOString() : null,
    })
    .eq("id", proposalId);

  revalidatePath("/");
  revalidatePath("/admin");
}

function defaultVotingDeadline() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(23, 59, 0, 0);
  return deadline;
}

function optionValues(formData: FormData) {
  const seen = new Set<string>();
  return formData
    .getAll("options")
    .map(stringValue)
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
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
