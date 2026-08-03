"use client";

import {
  deleteAnnouncementAction,
  updateAnnouncementAction,
  type ProposalActionState,
} from "@/app/actions/proposals";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { AlertTriangle, Pin, Save, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

type ManagedAnnouncement = {
  id: string;
  body: string;
  is_pinned: boolean;
  published_at: string | null;
  title: string;
};

const initialState: ProposalActionState = { message: "", ok: false };

export function ManageAnnouncementCard({
  announcement,
}: {
  announcement: ManagedAnnouncement;
}) {
  const [state, formAction, pending] = useActionState(updateAnnouncementAction, initialState);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <article className="rounded-[10px] border border-[#d9decf] bg-white p-4 shadow-sm">
      <form action={formAction} className="grid gap-3">
        <input name="announcementId" type="hidden" value={announcement.id} />
        <input
          className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base font-semibold outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={announcement.title}
          disabled={pending}
          maxLength={140}
          name="title"
          required
        />
        <textarea
          className="min-h-28 rounded-md border border-[#d9decf] bg-white px-3 py-3 text-base leading-6 outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={announcement.body}
          disabled={pending}
          maxLength={4000}
          name="body"
          required
        />
        <label className="flex h-10 items-center gap-3 text-sm font-semibold text-[#293421]">
          <input
            className="size-4 accent-[#183a2b]"
            defaultChecked={announcement.is_pinned}
            disabled={pending}
            name="isPinned"
            type="checkbox"
          />
          <Pin size={16} aria-hidden="true" />
          Pin post
        </label>
        <label className="flex h-10 items-center gap-3 text-sm font-semibold text-[#293421]">
          <input
            className="size-4 accent-[#183a2b]"
            defaultChecked={Boolean(announcement.published_at)}
            disabled={pending}
            name="isPublished"
            type="checkbox"
          />
          Published
        </label>
        <ActionFeedback state={state} />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            <Save size={17} aria-hidden="true" />
            Save
          </button>
          {isConfirmingDelete ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle size={16} aria-hidden="true" />
                Delete this post?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  disabled={pending}
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  <X size={16} aria-hidden="true" />
                  Cancel
                </button>
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
                  disabled={pending}
                  formAction={deleteAnnouncementAction}
                  type="submit"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              disabled={pending}
              onClick={() => setIsConfirmingDelete(true)}
              type="button"
            >
              <Trash2 size={17} aria-hidden="true" />
              Take down
            </button>
          )}
        </div>
      </form>
    </article>
  );
}
