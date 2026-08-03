import { BadgePill } from "@/components/members/badge-pill";
import { MemberAvatar } from "@/components/members/member-avatar";
import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import {
  attachBadgesToMembers,
  type MemberBadge,
  type MemberBadgeAward,
} from "@/lib/members/badges";
import { memberDisplayName, memberSubtitle } from "@/lib/members/display";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ChevronRight, UsersRound } from "lucide-react";
import Link from "next/link";

type HeaderMember = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type DirectoryMember = HeaderMember & {
  avatar_color: string | null;
  badges: MemberBadge[] | null;
  id: string;
  profile_bio: string | null;
};
type BaseDirectoryMember = Omit<DirectoryMember, "badges">;

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const [{ data: currentMember }, { data: baseMembers, error: membersError }] = await Promise.all([
    supabase
      .from("league_members")
      .select("display_name, team_name, is_member, is_admin, revoked_at")
      .eq("auth_user_id", user.id)
      .maybeSingle<HeaderMember>(),
    supabase
      .from("league_members")
      .select("id, display_name, team_name, profile_bio, avatar_color, is_member, is_admin, revoked_at")
      .eq("is_member", true)
      .is("revoked_at", null)
      .order("team_name", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true })
      .returns<BaseDirectoryMember[]>(),
  ]);
  const memberIds = (baseMembers ?? []).map((member) => member.id);
  const { data: badgeAwards } = memberIds.length
    ? await supabase
        .from("member_badges")
        .select("member_id, quantity, badge:badge_definitions(slug, name, description, icon_key, color)")
        .in("member_id", memberIds)
        .returns<MemberBadgeAward[]>()
    : { data: [] as MemberBadgeAward[] };
  const members = attachBadgesToMembers(baseMembers, badgeAwards);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={currentMember} userEmail={user.email ?? null} />
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        <header className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UsersRound className="text-[#587246]" size={22} aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold">Members</h1>
              <p className="mt-1 text-sm text-[#626b59]">Active league profiles</p>
            </div>
          </div>
        </header>

        {membersError ? (
          <p className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            Members could not load: {membersError.message}
          </p>
        ) : (
        <div className="grid gap-3">
          {members.map((member) => (
            <Link
              className="group rounded-[10px] border border-[#d9decf] bg-white p-4 shadow-sm transition hover:border-[#b9c7ad] hover:bg-[#fbfcf8]"
              href={`/members/${member.id}`}
              key={member.id}
            >
              <article className="flex items-center gap-3">
                <MemberAvatar color={member.avatar_color} name={memberDisplayName(member)} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-[#293421]">
                    {memberDisplayName(member)}
                  </h2>
                  <p className="truncate text-sm text-[#626b59]">{memberSubtitle(member)}</p>
                  {member.profile_bio ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4c5547]">{member.profile_bio}</p>
                  ) : null}
                  {member.badges?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.badges.map((badge) => (
                        <BadgePill badge={badge} compact key={badge.badge?.slug ?? badge.quantity} />
                      ))}
                    </div>
                  ) : null}
                </div>
                <ChevronRight
                  className="shrink-0 text-[#8a9380] transition group-hover:translate-x-0.5 group-hover:text-[#587246]"
                  size={19}
                  aria-hidden="true"
                />
              </article>
            </Link>
          ))}
        </div>
        )}
      </section>
    </main>
  );
}
