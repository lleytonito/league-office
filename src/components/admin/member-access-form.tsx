"use client";

import { setMemberAccess } from "@/app/actions/member-access";
import { Ban, RotateCcw } from "lucide-react";
import { useFormStatus } from "react-dom";

type MemberAccessFormProps = {
  disabled?: boolean;
  isRevoked: boolean;
  memberId: string;
};

export function MemberAccessForm({
  disabled = false,
  isRevoked,
  memberId,
}: MemberAccessFormProps) {
  return (
    <form action={setMemberAccess}>
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="access" value={isRevoked ? "active" : "revoked"} />
      <SubmitButton disabled={disabled} isRevoked={isRevoked} />
    </form>
  );
}

function SubmitButton({
  disabled,
  isRevoked,
}: {
  disabled: boolean;
  isRevoked: boolean;
}) {
  const { pending } = useFormStatus();
  const Icon = isRevoked ? RotateCcw : Ban;

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex size-9 items-center justify-center rounded-md border border-[#d9decf] bg-white text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:cursor-not-allowed disabled:opacity-45"
      aria-label={isRevoked ? "Reactivate member" : "Revoke member"}
      title={isRevoked ? "Reactivate member" : "Revoke member"}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
