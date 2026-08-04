"use client";

import {
  approveProposalAction,
  deleteProposalAction,
  rejectProposalAction,
  type ProposalActionState,
} from "@/app/actions/proposals";
import { MemberIdentity, type IdentityMember } from "@/components/members/member-identity";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { AlertTriangle, Check, Plus, Trash2, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

type ReviewProposal = {
  id: string;
  created_at: string;
  rationale: string | null;
  summary: string;
  title: string;
  author: {
    avatar_color?: string | null;
    badges?: IdentityMember["badges"];
    display_name: string;
    id?: string;
    team_name: string | null;
  } | null;
  options: Array<{
    id: string;
    label: string;
    sort_order: number;
  }>;
};

const initialState: ProposalActionState = { message: "", ok: false };

export function ReviewProposalCard({ proposal }: { proposal: ReviewProposal }) {
  const [state, formAction, pending] = useActionState(approveProposalAction, initialState);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [options, setOptions] = useState(
    proposal.options.length ? proposal.options.map((option) => option.label) : ["Yes", "No"],
  );
  const defaultDeadline = useMemo(() => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    deadline.setHours(23, 59, 0, 0);
    return deadline.toISOString().slice(0, 16);
  }, []);

  return (
    <article className="rounded-lg border border-[#d9decf] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-sm text-[#6a725f]">
          Submitted by <MemberIdentity member={proposal.author ?? null} showBadge={false} size="sm" />
        </div>
        <p className="text-xs text-[#777f6c]">{formatDate(proposal.created_at)}</p>
      </div>

      <form action={formAction} className="mt-4 grid gap-3">
        <input name="proposalId" type="hidden" value={proposal.id} />
        <input
          className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base font-semibold outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={proposal.title}
          disabled={pending}
          maxLength={140}
          name="title"
          required
        />
        <textarea
          className="min-h-28 rounded-md border border-[#d9decf] bg-white px-3 py-3 text-base leading-6 outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={proposal.summary}
          disabled={pending}
          maxLength={4000}
          name="summary"
        />
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#293421]">Vote options</span>
            <button
              className="flex size-9 items-center justify-center rounded-md border border-[#d9decf] bg-white text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:opacity-50"
              disabled={pending || options.length >= 8}
              onClick={() => setOptions((current) => [...current, ""])}
              title="Add option"
              type="button"
            >
              <Plus size={17} aria-hidden="true" />
            </button>
          </div>
          {options.map((value, index) => (
            <div className="flex gap-2" key={index}>
              <input
                className="h-10 min-w-0 flex-1 rounded-md border border-[#d9decf] bg-white px-3 text-sm outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
                disabled={pending}
                maxLength={80}
                name="options"
                onChange={(event) => {
                  const next = [...options];
                  next[index] = event.target.value;
                  setOptions(next);
                }}
                required={index < 2}
                value={value}
              />
              <button
                aria-label="Remove option"
                className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d9decf] bg-white text-[#6a725f] transition hover:bg-[#eef2e8] disabled:opacity-40"
                disabled={pending || options.length <= 2}
                onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                type="button"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-semibold text-[#293421]">
            Voting closes
            <input
              className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
              defaultValue={defaultDeadline}
              disabled={pending}
              name="closesAt"
              type="datetime-local"
            />
          </label>
          <label className="flex h-11 items-center gap-3 rounded-md border border-[#d9decf] bg-[#fbfcf8] px-3 text-sm font-semibold text-[#293421]">
            <input className="size-4 accent-[#183a2b]" disabled={pending} name="isPinned" type="checkbox" />
            Pin
          </label>
        </div>

        <ActionFeedback state={state} />

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            <Check size={17} aria-hidden="true" />
            Approve
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            disabled={pending}
            formAction={rejectProposalAction}
            type="submit"
          >
            <Trash2 size={17} aria-hidden="true" />
            Reject
          </button>
          {isConfirmingDelete ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 sm:col-span-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle size={16} aria-hidden="true" />
                Delete?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="flex h-10 items-center justify-center rounded-md border border-red-200 bg-white text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  disabled={pending}
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
                  disabled={pending}
                  formAction={deleteProposalAction}
                  type="submit"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              disabled={pending}
              onClick={() => setIsConfirmingDelete(true)}
              type="button"
            >
              <Trash2 size={17} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      </form>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
