export function memberDisplayName(member: {
  display_name: string;
  team_name: string | null;
}) {
  return member.team_name || member.display_name;
}

export function memberSubtitle(member: {
  display_name: string;
  team_name: string | null;
}) {
  return member.team_name ? member.display_name : "No team set";
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
