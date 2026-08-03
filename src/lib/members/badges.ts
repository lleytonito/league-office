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
