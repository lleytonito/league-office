"use client";

import {
  applyDetectedChampionBadgesAction,
  linkMemberToEspnTeamAction,
  refreshEspnAnalyticsAction,
  removeMemberTeamLinkAction,
  type EspnActionState,
} from "@/app/actions/espn";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Link2, RefreshCw, Trash2, Trophy } from "lucide-react";
import { useActionState } from "react";

type MemberOption = {
  display_name: string;
  id: string;
  team_name: string | null;
};

type EspnOwnerOption = {
  espnMemberId: string;
  label: string;
  latestSeason: number;
  ownerDisplayName: string | null;
  teamName: string;
};

type TeamLink = {
  espn_member_id: string;
  member_id: string;
  member?: {
    display_name: string;
    team_name: string | null;
  } | null;
};

type ChampionshipDetection = {
  member_id: string | null;
  owner_display_name: string | null;
  season: number;
  team_name: string;
};

type MatchupIntegrityRow = {
  matchups: number;
  missingOwnerNames: number;
  season: number;
  teams: number;
  undecided: number;
  zeroZero: number;
};

const initialState: EspnActionState = { message: "", ok: false };

export function EspnAnalyticsAdmin({
  championshipDetections,
  espnOwners,
  links,
  matchupIntegrity,
  members,
}: {
  championshipDetections: ChampionshipDetection[];
  espnOwners: EspnOwnerOption[];
  links: TeamLink[];
  matchupIntegrity: MatchupIntegrityRow[];
  members: MemberOption[];
}) {
  const [refreshState, refreshAction, refreshPending] = useActionState(
    refreshEspnAnalyticsAction,
    initialState,
  );
  const [linkState, linkAction, linkPending] = useActionState(linkMemberToEspnTeamAction, initialState);
  const [badgeState, badgeAction, badgePending] = useActionState(
    applyDetectedChampionBadgesAction,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeMemberTeamLinkAction,
    initialState,
  );

  const linkedMemberIds = new Set(links.map((link) => link.member_id));
  const ownerByEspnId = new Map(espnOwners.map((owner) => [owner.espnMemberId, owner]));
  const linkedChampionCount = championshipDetections.filter((detection) => detection.member_id).length;

  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">ESPN analytics</h2>
          <p className="mt-2 text-sm leading-6 text-[#626b59]">
            Refresh snapshots, link League Office profiles to ESPN teams, and review detected champions.
          </p>
        </div>
        <form action={refreshAction}>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-3 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
            disabled={refreshPending}
            type="submit"
          >
            <RefreshCw className={refreshPending ? "animate-spin" : ""} size={16} aria-hidden="true" />
            Refresh ESPN
          </button>
        </form>
      </div>
      <ActionFeedback state={refreshState} />

      <form action={linkAction} className="mt-5 grid gap-3 rounded-[8px] bg-[#f7f8f4] p-4">
        <div className="flex items-center gap-2">
          <Link2 className="text-[#587246]" size={17} aria-hidden="true" />
          <h3 className="font-semibold">Link profile to ESPN team</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[#293421]">
            League Office profile
            <select
              className="h-10 rounded-md border border-[#d9decf] bg-white px-3 text-sm outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
              disabled={linkPending}
              name="memberId"
              required
            >
              <option value="">Choose profile</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name}
                  {member.team_name ? ` - ${member.team_name}` : ""}
                  {linkedMemberIds.has(member.id) ? " (linked)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#293421]">
            ESPN team identity
            <select
              className="h-10 rounded-md border border-[#d9decf] bg-white px-3 text-sm outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
              disabled={linkPending}
              name="espnMemberId"
              required
            >
              <option value="">Choose ESPN team</option>
              {espnOwners.map((owner) => (
                <option key={owner.espnMemberId} value={owner.espnMemberId}>
                  {owner.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input name="label" type="hidden" value="" />
        <ActionFeedback state={linkState} />
        <button
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d9decf] bg-white px-3 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:opacity-60 sm:w-fit"
          disabled={linkPending}
          type="submit"
        >
          <Link2 size={16} aria-hidden="true" />
          Save link
        </button>
      </form>

      <div className="mt-4 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
        <h3 className="font-semibold">Current links</h3>
        <ActionFeedback state={removeState} />
        {links.length ? (
          <div className="mt-3 grid gap-2 text-sm">
            {links.map((link) => {
              const owner = ownerByEspnId.get(link.espn_member_id);
              return (
                <div
                  className="grid gap-2 rounded-md bg-white px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={`${link.member_id}-${link.espn_member_id}`}
                >
                  <p className="min-w-0 text-[#4e5a45]">
                    <span className="font-semibold text-[#293421]">
                      {link.member?.display_name ?? "League Office profile"}
                    </span>{" "}
                    linked to{" "}
                    <span className="font-semibold text-[#293421]">
                      {owner?.ownerDisplayName ?? owner?.teamName ?? "ESPN team"}
                    </span>
                    {owner?.teamName ? ` - ${owner.teamName}` : ""}
                  </p>
                  <form action={removeAction}>
                    <input name="memberId" type="hidden" value={link.member_id} />
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      disabled={removePending}
                      type="submit"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#626b59]">No ESPN teams are linked yet.</p>
        )}
      </div>

      <div className="mt-5 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="text-[#b8872f]" size={17} aria-hidden="true" />
            <h3 className="font-semibold">Detected champions</h3>
          </div>
          <form action={badgeAction}>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-3 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
              disabled={badgePending || linkedChampionCount === 0}
              type="submit"
            >
              <Trophy size={16} aria-hidden="true" />
              Apply badges
            </button>
          </form>
        </div>
        <ActionFeedback state={badgeState} />
        {championshipDetections.length ? (
          <div className="mt-3 grid gap-2 text-sm">
            {championshipDetections.map((detection) => (
              <p
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-[#4e5a45]"
                key={detection.season}
              >
                <span>
                  <strong className="text-[#293421]">{detection.season}</strong>{" "}
                  {detection.owner_display_name ?? detection.team_name}
                  {detection.owner_display_name ? ` - ${detection.team_name}` : ""}
                </span>
                <span className={detection.member_id ? "text-[#587246]" : "text-amber-800"}>
                  {detection.member_id ? "linked" : "needs profile link"}
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#626b59]">
            Refresh ESPN to detect historical champions.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-[8px] border border-[#e1e5d9] bg-[#fbfcf8] p-4">
        <h3 className="font-semibold">Matchup integrity</h3>
        {matchupIntegrity.length ? (
          <div className="mt-3 grid gap-2 text-sm">
            {matchupIntegrity.slice(0, 8).map((row) => (
              <div
                className="grid grid-cols-[auto_1fr] gap-2 rounded-md bg-white px-3 py-2 text-[#4e5a45] sm:grid-cols-[auto_repeat(5,1fr)]"
                key={row.season}
              >
                <span className="font-semibold text-[#293421]">{row.season}</span>
                <span>{row.teams} teams</span>
                <span>{row.matchups} games</span>
                <span>{row.zeroZero} 0-0</span>
                <span>{row.undecided} undecided</span>
                <span>{row.missingOwnerNames} missing names</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#626b59]">
            Refresh ESPN to populate matchup checks.
          </p>
        )}
      </div>
    </section>
  );
}
