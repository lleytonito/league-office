import { LoginWall } from "@/components/auth/login-wall";
import { AppHeader } from "@/components/layout/app-header";
import { SubmitProposalForm } from "@/components/proposals/submit-proposal-form";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ClipboardList, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Member = {
  id: string;
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

export default async function SubmitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const { data: member } = user
    ? await supabase
        .from("league_members")
        .select("id, display_name, team_name, is_member, is_admin, revoked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle<Member>()
    : { data: null };

  const isMemberActive = Boolean(member?.is_member && !member.revoked_at);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />

      <section className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        <div className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#edf4e6] text-[#315235]">
              <ClipboardList size={19} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Submit proposal</h1>
              <p className="mt-1 text-sm text-[#626b59]">Title, description, and voting options.</p>
            </div>
          </div>

          {!isMemberActive ? (
            <div className="mt-5 flex gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
              <p className="text-sm leading-6">This account is read-only and cannot submit proposals.</p>
            </div>
          ) : (
            <div className="mt-5">
              <SubmitProposalForm disabled={false} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
