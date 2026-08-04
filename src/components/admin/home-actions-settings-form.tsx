"use client";

import {
  updateHomeActionsSettingAction,
  type SettingsActionState,
} from "@/app/actions/settings";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Eye, EyeOff, Save } from "lucide-react";
import { useActionState } from "react";

const initialState: SettingsActionState = { message: "", ok: false };

export function HomeActionsSettingsForm({
  leagueHistoryVisible,
  visible,
}: {
  leagueHistoryVisible: boolean;
  visible: boolean;
}) {
  const [state, action, pending] = useActionState(updateHomeActionsSettingAction, initialState);

  return (
    <form action={action} className="grid gap-3">
      <label className="flex items-start gap-3 rounded-[10px] border border-[#d9decf] bg-[#fbfcf8] p-4">
        <input
          className="mt-1 size-5 accent-[#183a2b]"
          defaultChecked={visible}
          disabled={pending}
          name="visible"
          type="checkbox"
        />
        <span className="grid gap-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
            {visible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            Show feed action panel
          </span>
          <span className="text-sm leading-6 text-[#626b59]">
            Displays the proposal and rules buttons under pinned posts on the home feed.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-[10px] border border-[#d9decf] bg-[#fbfcf8] p-4">
        <input
          className="mt-1 size-5 accent-[#183a2b]"
          defaultChecked={leagueHistoryVisible}
          disabled={pending}
          name="leagueHistoryVisible"
          type="checkbox"
        />
        <span className="grid gap-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#293421]">
            {leagueHistoryVisible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            Show league history panel
          </span>
          <span className="text-sm leading-6 text-[#626b59]">
            Displays the Teams and Analytics buttons after a member links their ESPN team.
          </span>
        </span>
      </label>
      <ActionFeedback state={state} />
      <button
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <Save size={16} aria-hidden="true" />
        Save setting
      </button>
    </form>
  );
}
