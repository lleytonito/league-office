export type BadgeDefinition = {
  color: string;
  description: string | null;
  icon_key: string;
  name: string;
  slug: string;
};

export type MemberBadge = {
  quantity: number;
  badge: BadgeDefinition | null;
};

export type MemberBadgeAward = MemberBadge & {
  member_id: string;
};

export type BadgeableMember = {
  badges?: MemberBadge[] | null;
  id: string;
};

export function badgesForMember(
  awards: MemberBadgeAward[] | null | undefined,
  memberId: string | null | undefined,
) {
  if (!memberId) {
    return [];
  }

  return (awards ?? []).filter((award) => award.member_id === memberId);
}

export function attachBadgesToMember<T extends BadgeableMember>(
  member: T,
  awards: MemberBadgeAward[] | null | undefined,
) {
  return {
    ...member,
    badges: badgesForMember(awards, member.id),
  };
}

export function attachBadgesToMembers<T extends BadgeableMember>(
  members: T[] | null | undefined,
  awards: MemberBadgeAward[] | null | undefined,
) {
  return (members ?? []).map((member) => attachBadgesToMember(member, awards));
}

export function hasChampionBadge(badges: MemberBadge[] | null | undefined) {
  return Boolean(championBadge(badges));
}

export function championBadge(badges: MemberBadge[] | null | undefined) {
  return badges?.find((badge) => badge.badge?.slug === "league-champion" && badge.quantity > 0);
}

export function badgeLabel(memberBadge: MemberBadge) {
  const name = memberBadge.badge?.name ?? "Badge";
  return memberBadge.quantity > 1 ? `${memberBadge.quantity}x ${name}` : name;
}
