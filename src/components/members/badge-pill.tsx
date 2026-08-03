import { badgeLabel, type MemberBadge } from "@/lib/members/badges";
import { Award, Medal, ShieldCheck, Sparkles, Trophy } from "lucide-react";

export function BadgePill({
  badge,
  compact = false,
}: {
  badge: MemberBadge;
  compact?: boolean;
}) {
  const color = badge.badge?.color ?? "#b8872f";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-white font-semibold shadow-sm ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
      style={{ borderColor: `${color}55`, color }}
      title={badge.badge?.description ?? badge.badge?.name ?? "Badge"}
    >
      <BadgeIcon iconKey={badge.badge?.icon_key} size={compact ? 13 : 15} />
      {badgeLabel(badge)}
    </span>
  );
}

function BadgeIcon({ iconKey, size }: { iconKey: string | null | undefined; size: number }) {
  switch (iconKey) {
    case "medal":
      return <Medal size={size} aria-hidden="true" />;
    case "shield-check":
      return <ShieldCheck size={size} aria-hidden="true" />;
    case "sparkles":
      return <Sparkles size={size} aria-hidden="true" />;
    case "trophy":
      return <Trophy size={size} aria-hidden="true" />;
    default:
      return <Award size={size} aria-hidden="true" />;
  }
}
