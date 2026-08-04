"use client";

import { selectOwnEspnTeamAction, type EspnActionState } from "@/app/actions/espn";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Link2 } from "lucide-react";
import { useActionState } from "react";

type TeamOption = {
  espnMemberId: string;
  logoUrl: string | null;
  ownerDisplayName: string | null;
  teamName: string;
};

const initialState: EspnActionState = { message: "", ok: false };

export function TeamLinkPrompt({ teams }: { teams: TeamOption[] }) {
  const [state, action, pending] = useActionState(selectOwnEspnTeamAction, initialState);

  if (!teams.length) {
    return null;
  }

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Link2 className="text-[#587246]" size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold">Please select your team</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#626b59]">
        This connects your League Office profile to ESPN history and unlocks head-to-head records.
      </p>
      <form action={action} className="mt-4 grid gap-3">
        <div className="grid gap-2">
          {teams.map((team) => (
            <label
              className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-3 transition hover:border-[#b9c7ad] has-[:checked]:border-[#587246] has-[:checked]:bg-[#f4f8ef]"
              key={team.espnMemberId}
            >
              <input
                className="size-4 accent-[#183a2b]"
                disabled={pending}
                name="espnMemberId"
                required
                type="radio"
                value={team.espnMemberId}
              />
              <TeamLogo logoUrl={team.logoUrl} teamName={team.teamName} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#293421]">
                  {team.ownerDisplayName ?? team.teamName}
                </span>
                <span className="block truncate text-sm text-[#626b59]">{team.teamName}</span>
              </span>
            </label>
          ))}
        </div>
        <ActionFeedback state={state} />
        <button
          className="h-11 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          Link my team
        </button>
      </form>
    </section>
  );
}

function TeamLogo({ logoUrl, teamName }: { logoUrl: string | null; teamName: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-[#d9decf] bg-white object-cover"
        src={logoUrl}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#183a2b] text-xs font-semibold text-white">
      {teamName.slice(0, 2).toUpperCase()}
    </span>
  );
}
