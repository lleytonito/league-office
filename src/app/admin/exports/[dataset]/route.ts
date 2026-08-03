import { rowsToCsv, type CsvRow } from "@/lib/admin/csv";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type DatasetKey = keyof typeof datasets;

type DatasetConfig = {
  filename: string;
  order?: {
    ascending: boolean;
    column: string;
  };
  select: string;
  table: string;
};

const datasets = {
  announcements: {
    filename: "league-office-announcements.csv",
    order: { ascending: false, column: "created_at" },
    select: "id, title, body, is_pinned, pinned_at, published_at, created_at, updated_at",
    table: "feed_announcements",
  },
  badges: {
    filename: "league-office-badges.csv",
    order: { ascending: false, column: "awarded_at" },
    select:
      "id, member_id, quantity, note, awarded_at, updated_at, member:league_members(display_name, team_name), badge:badge_definitions(slug, name, icon_key, color)",
    table: "member_badges",
  },
  members: {
    filename: "league-office-members.csv",
    order: { ascending: true, column: "created_at" },
    select:
      "id, display_name, team_name, avatar_color, is_member, is_admin, revoked_at, profile_bio, created_at, updated_at",
    table: "league_members",
  },
  proposals: {
    filename: "league-office-proposals.csv",
    order: { ascending: false, column: "created_at" },
    select:
      "id, title, summary, rationale, status, passed, is_pinned, pinned_at, voting_closes_at, closed_at, published_at, created_at, updated_at, author:league_members(display_name, team_name)",
    table: "proposals",
  },
  votes: {
    filename: "league-office-votes.csv",
    order: { ascending: false, column: "created_at" },
    select:
      "id, proposal_id, option_id, voter_member_id, created_at, updated_at, proposal:proposals(title), option:proposal_vote_options(label), voter:league_members(display_name, team_name)",
    table: "votes",
  },
} satisfies Record<string, DatasetConfig>;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await context.params;

  if (!isDatasetKey(dataset)) {
    return NextResponse.json({ error: "Export not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("league_members")
    .select("is_admin, is_member, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ is_admin: boolean; is_member: boolean; revoked_at: string | null }>();

  if (!member?.is_admin || !member.is_member || member.revoked_at) {
    return NextResponse.json({ error: "Commissioner access required." }, { status: 403 });
  }

  const config = datasets[dataset];
  let query = supabase.from(config.table).select(config.select);

  if (config.order) {
    query = query.order(config.order.column, { ascending: config.order.ascending });
  }

  const { data, error } = await query.returns<CsvRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = rowsToCsv(data ?? []);

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${config.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function isDatasetKey(dataset: string): dataset is DatasetKey {
  return dataset in datasets;
}
