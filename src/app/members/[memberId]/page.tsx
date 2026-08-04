import { BadgePill } from "@/components/members/badge-pill";
import { MemberAvatar } from "@/components/members/member-avatar";
import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { attachBadgesToMember, type MemberBadge, type MemberBadgeAward } from "@/lib/members/badges";
import { memberDisplayName, memberSubtitle } from "@/lib/members/display";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type HeaderMember = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type ProfileMember = HeaderMember & {
  avatar_color: string | null;
  badges: MemberBadge[] | null;
  id: string;
  profile_bio: string | null;
};

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const [{ data: currentMember }, { data: baseMember }, { data: teamLink }] = await Promise.all([
    supabase
      .from("league_members")
      .select("display_name, team_name, is_member, is_admin, revoked_at")
      .eq("auth_user_id", user.id)
      .maybeSingle<HeaderMember>(),
    supabase
      .from("league_members")
      .select("id, display_name, team_name, profile_bio, avatar_color, is_member, is_admin, revoked_at")
      .eq("id", memberId)
      .maybeSingle<Omit<ProfileMember, "badges">>(),
    supabase
      .from("member_team_links")
      .select("espn_member_id")
      .eq("member_id", memberId)
      .maybeSingle<{ espn_member_id: string }>(),
  ]);

  if (!baseMember) {
    notFound();
  }

  if (teamLink?.espn_member_id) {
    redirect(`/teams/${encodeURIComponent(teamLink.espn_member_id)}`);
  }

  const { data: badgeAwards } = await supabase
    .from("member_badges")
    .select("member_id, quantity, badge:badge_definitions(slug, name, description, icon_key, color)")
    .eq("member_id", baseMember.id)
    .returns<MemberBadgeAward[]>();
  const member = attachBadgesToMember({ ...baseMember, badges: [] as MemberBadge[] }, badgeAwards);
  const displayName = memberDisplayName(member);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={currentMember} userEmail={user.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/members">
          <ArrowLeft size={16} aria-hidden="true" />
          Members
        </Link>

        <article className="overflow-hidden rounded-[10px] border border-[#d9decf] bg-white shadow-sm">
          <div className="border-l-4 border-[#587246] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <MemberAvatar color={member.avatar_color} name={displayName} size="lg" />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-tight text-[#111411]">{displayName}</h1>
                <p className="mt-1 text-base text-[#626b59]">{memberSubtitle(member)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.is_admin ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4e6] px-3 py-1.5 text-sm font-semibold text-[#315235]">
                      <Shield size={15} aria-hidden="true" />
                      Commissioner
                    </span>
                  ) : null}
                  {member.badges?.map((badge) => (
                    <BadgePill badge={badge} key={badge.badge?.slug ?? badge.quantity} />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </article>

        <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy className="text-[#b8872f]" size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Badges</h2>
          </div>
          {member.badges?.length ? (
            <div className="mt-4 grid gap-3">
              {member.badges.map((badge) => (
                <div
                  className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4"
                  key={badge.badge?.slug ?? badge.quantity}
                >
                  <BadgePill badge={badge} />
                  {badge.badge?.description ? (
                    <p className="mt-3 text-sm leading-6 text-[#626b59]">{badge.badge.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[10px] border border-dashed border-[#d9decf] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#626b59]">
              No badges awarded yet.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
