"use client";

import type { ProposalActionState } from "@/app/actions/proposals";

export function ActionFeedback({ state }: { state: ProposalActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        state.ok
          ? "border-[#c9d8b8] bg-[#f2f7ed] text-[#2f4b2f]"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}
