"use client";

import { createAnnouncementAction } from "@/app/actions/proposals";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Megaphone } from "lucide-react";
import { useActionState } from "react";

const initialState = { message: "", ok: false };

export function AnnouncementForm() {
  const [state, formAction, pending] = useActionState(createAnnouncementAction, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <input
        className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
        disabled={pending}
        maxLength={140}
        name="title"
        placeholder="Pinned post title"
        required
      />
      <textarea
        className="min-h-28 rounded-md border border-[#d9decf] bg-white px-3 py-3 text-base leading-6 outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
        disabled={pending}
        maxLength={4000}
        name="body"
        placeholder="Write an update for the league feed."
        required
      />
      <label className="flex items-center gap-3 text-sm font-semibold text-[#293421]">
        <input
          className="size-4 accent-[#183a2b]"
          defaultChecked
          disabled={pending}
          name="isPinned"
          type="checkbox"
        />
        Pin to top
      </label>
      <ActionFeedback state={state} />
      <button
        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <Megaphone size={17} aria-hidden="true" />
        {pending ? "Publishing" : "Publish post"}
      </button>
    </form>
  );
}
