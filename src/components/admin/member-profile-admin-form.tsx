"use client";

import {
  setMemberBadgeAction,
  updateMemberProfileAction,
  type ProfileActionState,
} from "@/app/actions/profiles";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Save, Trophy } from "lucide-react";
import { useActionState } from "react";

type AdminMemberProfile = {
  display_name: string;
  id: string;
  team_name: string | null;
};

const initialState: ProfileActionState = { message: "", ok: false };

export function MemberProfileAdminForm({
  championCount,
  member,
}: {
  championCount: number;
  member: AdminMemberProfile;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateMemberProfileAction,
    initialState,
  );
  const [badgeState, badgeAction, badgePending] = useActionState(setMemberBadgeAction, initialState);

  return (
    <div className="grid gap-3">
      <form action={profileAction} className="grid gap-2">
        <input name="memberId" type="hidden" value={member.id} />
        <input
          className="h-10 rounded-md border border-[#d9decf] bg-white px-3 text-sm outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={member.display_name}
          disabled={profilePending}
          maxLength={80}
          name="displayName"
          required
        />
        <input
          className="h-10 rounded-md border border-[#d9decf] bg-white px-3 text-sm outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={member.team_name ?? ""}
          disabled={profilePending}
          maxLength={80}
          name="teamName"
          placeholder="Team name"
        />
        <ActionFeedback state={profileState} />
        <button
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#d9decf] bg-white px-3 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:opacity-60"
          disabled={profilePending}
          type="submit"
        >
          <Save size={16} aria-hidden="true" />
          Save names
        </button>
      </form>

      <form action={badgeAction} className="grid gap-2 rounded-md bg-[#f7f8f4] p-3">
        <input name="memberId" type="hidden" value={member.id} />
        <input name="badgeSlug" type="hidden" value="league-champion" />
        <label className="grid gap-2 text-xs font-semibold text-[#293421]">
          <span className="flex items-center gap-1.5">
            <Trophy className="text-[#b8872f]" size={14} aria-hidden="true" />
            Championships
          </span>
          <input
            className="h-10 rounded-md border border-[#d9decf] bg-white px-3 text-sm outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
            defaultValue={championCount}
            disabled={badgePending}
            max={99}
            min={0}
            name="quantity"
            type="number"
          />
        </label>
        <ActionFeedback state={badgeState} />
        <button
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-3 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
          disabled={badgePending}
          type="submit"
        >
          <Trophy size={16} aria-hidden="true" />
          Update badge
        </button>
      </form>
    </div>
  );
}
