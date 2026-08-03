import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";

type Member = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

export default async function AnalyticsPage() {
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
          <BarChart3 className="text-[#587246]" size={24} aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Analytics</h1>
          <p className="mt-2 text-sm leading-6 text-[#626b59]">Coming soon!</p>
        </div>
      </section>
    </main>
  );
}
