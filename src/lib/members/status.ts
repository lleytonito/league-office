export type MemberStatusInput = {
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
};

export function getMemberStatusLabel(member: MemberStatusInput) {
  if (!member.is_member || member.revoked_at) {
    return "Revoked";
  }

  if (member.is_admin) {
    return "Admin";
  }

  return "Member";
}

export function canManageMember(actorId: string | null, targetId: string) {
  return Boolean(actorId) && actorId !== targetId;
}
