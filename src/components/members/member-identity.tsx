import { BadgePill } from "@/components/members/badge-pill";
import { MemberAvatar } from "@/components/members/member-avatar";
import { championBadge, hasChampionBadge, type MemberBadge } from "@/lib/members/badges";
import { memberDisplayName, memberSubtitle } from "@/lib/members/display";
import { Trophy } from "lucide-react";
import Link from "next/link";

export type IdentityMember = {
  avatar_color?: string | null;
  badges?: MemberBadge[] | null;
  display_name: string;
  espn_member_id?: string | null;
  id?: string;
  team_name: string | null;
};

export function MemberIdentity({
  member,
  showAvatar = false,
  showBadge = true,
  size = "md",
}: {
  member: IdentityMember | null;
  showAvatar?: boolean;
  showBadge?: boolean;
  size?: "sm" | "md";
}) {
  if (!member) {
    return <span className="font-semibold text-[#293421]">League member</span>;
  }

  const name = memberDisplayName(member);
  const isChampion = hasChampionBadge(member.badges);
  const champion = championBadge(member.badges);
  const content = (
    <>
      {showAvatar ? <MemberAvatar color={member.avatar_color ?? null} name={name} size="sm" /> : null}
      <span className="min-w-0">
        <span
          className={`block truncate font-semibold ${
            isChampion ? "text-[#9a6a1f]" : "text-[#293421]"
          } ${size === "sm" ? "text-sm" : ""}`}
        >
          {name}
          {isChampion ? <Trophy className="ml-1 inline text-[#b8872f]" size={13} aria-hidden="true" /> : null}
        </span>
        {size !== "sm" ? (
          <span className="block truncate text-sm text-[#6a725f]">{memberSubtitle(member)}</span>
        ) : null}
      </span>
      {showBadge && champion ? <BadgePill badge={champion} compact /> : null}
    </>
  );

  if (!member.id) {
    return <span className="inline-flex min-w-0 items-center gap-2">{content}</span>;
  }

  return (
    <Link
      className="inline-flex min-w-0 items-center gap-2 rounded-md outline-none transition hover:text-[#315235] focus-visible:ring-2 focus-visible:ring-[#9eb58d]"
      href={member.espn_member_id ? `/teams/${encodeURIComponent(member.espn_member_id)}` : `/members/${member.id}`}
    >
      {content}
    </Link>
  );
}
