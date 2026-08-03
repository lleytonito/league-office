import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";

type Member = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: member } = user
    ? await supabase
        .from("league_members")
        .select("display_name, team_name, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<Member>()
    : { data: null };

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />
      <section className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>
        <div className="rounded-[10px] border border-[#d9decf] bg-white p-6 shadow-sm">
          <UserRound className="text-[#587246]" size={24} aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Profile</h1>
          {member ? (
            <div className="mt-4 grid gap-3 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {member.display_name}
              </p>
              <p>
                <span className="font-semibold">Team:</span> {member.team_name ?? "Not set yet"}
              </p>
              <p>
                <span className="font-semibold">Role:</span> {member.is_admin ? "Admin" : "Member"}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-[#626b59]">
                Sign in to view your league profile.
              </p>
              <GoogleSignInButton
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60"
                label="Sign in with Google"
                shortLabel="Sign in"
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
