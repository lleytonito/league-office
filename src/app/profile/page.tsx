import { BadgePill } from "@/components/members/badge-pill";
import { MemberAvatar } from "@/components/members/member-avatar";
import { ProfileForm } from "@/components/members/profile-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AppHeader } from "@/components/layout/app-header";
import { SeasonFinishes } from "@/components/teams/season-finishes";
import { TeamLogo } from "@/components/teams/team-logo";
import { attachBadgesToMember, type MemberBadge, type MemberBadgeAward } from "@/lib/members/badges";
import { memberDisplayName } from "@/lib/members/display";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Eye, Link2, Trophy, UserRound } from "lucide-react";
import Link from "next/link";

type Member = {
  avatar_color: string | null;
  badges: MemberBadge[] | null;
  display_name: string;
  id: string;
  is_admin: boolean;
  is_member: boolean;
  profile_bio: string | null;
  revoked_at: string | null;
  team_name: string | null;
};

type EspnTeamRow = {
  espn_member_id: string | null;
  espn_team_id: number;
  final_rank: number | null;
  logo_url: string | null;
  owner_display_name: string | null;
  season: number;
  team_name: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: baseMember, error: memberError } = user
    ? await supabase
        .from("league_members")
        .select("id, display_name, team_name, profile_bio, avatar_color, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<Omit<Member, "badges">>()
    : { data: null, error: null };
  const { data: badgeAwards } = baseMember
    ? await supabase
        .from("member_badges")
        .select("member_id, quantity, badge:badge_definitions(slug, name, description, icon_key, color)")
        .eq("member_id", baseMember.id)
        .returns<MemberBadgeAward[]>()
    : { data: [] as MemberBadgeAward[] };
  const { data: teamLink } = baseMember
    ? await supabase
        .from("member_team_links")
        .select("espn_member_id")
        .eq("member_id", baseMember.id)
        .maybeSingle<{ espn_member_id: string }>()
    : { data: null };
  const { data: linkedTeams } = teamLink?.espn_member_id
    ? await supabase
        .from("espn_teams")
        .select("season, espn_member_id, espn_team_id, owner_display_name, team_name, logo_url, final_rank")
        .eq("espn_member_id", teamLink.espn_member_id)
        .order("season", { ascending: false })
        .returns<EspnTeamRow[]>()
    : { data: [] as EspnTeamRow[] };
  const member = baseMember
    ? attachBadgesToMember({ ...baseMember, badges: [] as MemberBadge[] }, badgeAwards)
    : null;
  const latestLinkedTeam = linkedTeams?.[0] ?? null;

  const canEdit = Boolean(member?.is_member && !member.revoked_at);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        <div className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <UserRound className="text-[#587246]" size={24} aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Your profile</h1>
          {memberError ? (
            <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              Profile could not load: {memberError.message}
            </p>
          ) : member ? (
            <div className="mt-5 grid gap-5">
              <div className="flex items-center gap-3 rounded-[10px] bg-[#fbfcf8] p-4">
                <MemberAvatar color={member.avatar_color} name={memberDisplayName(member)} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-[#293421]">
                    {memberDisplayName(member)}
                  </p>
                  <p className="truncate text-sm text-[#626b59]">
                    {member.is_admin ? "Commissioner" : "League member"}
                  </p>
                </div>
              </div>

              {canEdit ? (
                <ProfileForm member={member} />
              ) : (
                <p className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Your membership is not active, so profile editing is paused.
                </p>
              )}

              <section className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
                <div className="flex items-center gap-2">
                  <Link2 className="text-[#587246]" size={18} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Linked team</h2>
                </div>
                {latestLinkedTeam && teamLink?.espn_member_id ? (
                  <Link
                    className="mt-3 flex items-center gap-3 rounded-[10px] border border-[#d9decf] bg-white p-3 transition hover:bg-[#eef2e8]"
                    href={`/teams/${encodeURIComponent(teamLink.espn_member_id)}`}
                  >
                    <TeamLogo logoUrl={latestLinkedTeam.logo_url} teamName={latestLinkedTeam.team_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#293421]">
                        {latestLinkedTeam.owner_display_name ?? latestLinkedTeam.team_name}
                      </span>
                      <span className="block truncate text-sm text-[#626b59]">{latestLinkedTeam.team_name}</span>
                    </span>
                  </Link>
                ) : (
                  <p className="mt-3 rounded-[10px] border border-dashed border-[#d9decf] bg-white p-4 text-sm leading-6 text-[#626b59]">
                    Please link your team from the main feed.
                  </p>
                )}
              </section>

              {linkedTeams?.length ? <SeasonFinishes teams={linkedTeams} /> : null}

              <section className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[#b8872f]" size={18} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Badges</h2>
                </div>
                {member.badges?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.badges.map((badge) => (
                      <BadgePill badge={badge} key={badge.badge?.slug ?? badge.quantity} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[#626b59]">
                    Badges appear here.
                  </p>
                )}
              </section>

              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d9decf] bg-white px-4 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8]"
                href={`/members/${member.id}`}
              >
                <Eye size={17} aria-hidden="true" />
                View public profile
              </Link>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-[#626b59]">
                Sign in to view and edit your league profile.
              </p>
              <GoogleSignInButton
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
                label="Sign in with Google"
                shortLabel="Sign in"
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
