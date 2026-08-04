"use client";

import { submitProposalAction } from "@/app/actions/proposals";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Plus, Send, X } from "lucide-react";
import { useActionState, useState } from "react";

const initialState = { message: "", ok: false };

export function SubmitProposalForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(submitProposalAction, initialState);
  const [options, setOptions] = useState(["Yes", "No"]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#293421]" htmlFor="proposal-title">
          Proposal title
        </label>
        <input
          className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          disabled={disabled || pending}
          id="proposal-title"
          maxLength={140}
          name="title"
          placeholder="Move waivers to Wednesday"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#293421]" htmlFor="proposal-summary">
          Proposal text
        </label>
        <textarea
          className="min-h-32 rounded-md border border-[#d9decf] bg-white px-3 py-3 text-base leading-6 outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          disabled={disabled || pending}
          id="proposal-summary"
          maxLength={4000}
          name="summary"
          placeholder="Describe the change and how it should work."
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-[#293421]">Vote options</label>
          <button
            className="flex size-9 items-center justify-center rounded-md border border-[#d9decf] bg-white text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:opacity-50"
            disabled={disabled || pending || options.length >= 8}
            onClick={() => setOptions((current) => [...current, ""])}
            title="Add option"
            type="button"
          >
            <Plus size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-2">
          {options.map((value, index) => (
            <div className="flex gap-2" key={index}>
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-[#d9decf] bg-white px-3 text-base outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
                disabled={disabled || pending}
                maxLength={80}
                name="options"
                onChange={(event) => {
                  const next = [...options];
                  next[index] = event.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${index + 1}`}
                required={index < 2}
                value={value}
              />
              <button
                aria-label="Remove option"
                className="flex size-11 shrink-0 items-center justify-center rounded-md border border-[#d9decf] bg-white text-[#6a725f] transition hover:bg-[#eef2e8] disabled:opacity-40"
                disabled={disabled || pending || options.length <= 2}
                onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                type="button"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ActionFeedback state={state} />

      <button
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || pending}
        type="submit"
      >
        <Send size={17} aria-hidden="true" />
        {pending ? "Submitting" : "Submit for review"}
      </button>
    </form>
  );
}
