"use client";

import { updateOwnProfileAction, type ProfileActionState } from "@/app/actions/profiles";
import { ActionFeedback } from "@/components/proposals/action-feedback";
import { Save } from "lucide-react";
import { useActionState } from "react";

type EditableProfile = {
  avatar_color: string | null;
  display_name: string;
  profile_bio: string | null;
  team_name: string | null;
};

const initialState: ProfileActionState = { message: "", ok: false };
const avatarColors = ["#183a2b", "#587246", "#7a5638", "#b8872f", "#425c7a", "#6f4d75"];

export function ProfileForm({ member }: { member: EditableProfile }) {
  const [state, formAction, pending] = useActionState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-[#293421]">
        Display name
        <input
          className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={member.display_name}
          disabled={pending}
          maxLength={80}
          name="displayName"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-[#293421]">
        Team name
        <input
          className="h-11 rounded-md border border-[#d9decf] bg-white px-3 text-base outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={member.team_name ?? ""}
          disabled={pending}
          maxLength={80}
          name="teamName"
          placeholder="Add your team name"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-[#293421]">
        Bio
        <textarea
          className="min-h-28 rounded-md border border-[#d9decf] bg-white px-3 py-3 text-base leading-6 outline-none transition focus:border-[#587246] focus:ring-2 focus:ring-[#d9e5c9]"
          defaultValue={member.profile_bio ?? ""}
          disabled={pending}
          maxLength={280}
          name="profileBio"
          placeholder="A short line about your team, style, or league lore."
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-[#293421]">Avatar color</legend>
        <div className="flex flex-wrap gap-2">
          {avatarColors.map((color) => (
            <label
              className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#d9decf]"
              key={color}
              style={{ backgroundColor: color }}
              title={color}
            >
              <input
                className="peer sr-only"
                defaultChecked={(member.avatar_color ?? "#183a2b").toLowerCase() === color}
                disabled={pending}
                name="avatarColor"
                type="radio"
                value={color}
              />
              <span className="size-4 rounded-full bg-white opacity-0 ring-2 ring-white transition peer-checked:opacity-100" />
            </label>
          ))}
        </div>
      </fieldset>

      <ActionFeedback state={state} />

      <button
        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <Save size={17} aria-hidden="true" />
        Save profile
      </button>
    </form>
  );
}
