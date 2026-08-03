import { LoginWall } from "@/components/auth/login-wall";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import {
  ClipboardList,
  Clock,
  Crown,
  ShieldAlert,
  Trophy,
  Vote,
  type LucideIcon,
} from "lucide-react";

type Member = {
  display_name: string;
  is_admin: boolean;
  is_member: boolean;
  revoked_at: string | null;
  team_name: string | null;
};

type Proposal = {
  created_at: string;
  id: string;
  status: string;
  summary: string;
  title: string;
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginWall />;
  }

  const { data: member } = await supabase
    .from("league_members")
    .select("display_name, team_name, is_member, is_admin, revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<Member>();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, title, summary, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Proposal[]>();

  const isReadOnly = !member?.is_member || Boolean(member.revoked_at);

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#151712]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#182214] text-white">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.16em] text-[#3e4a36]">
                League Office
              </p>
              <p className="truncate text-sm text-[#6a725f]">
                {member?.team_name ?? member?.display_name ?? user.email}
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        {isReadOnly ? (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
            <div>
              <h1 className="text-base font-semibold">Read-only access</h1>
              <p className="mt-1 text-sm leading-6">
                You can view league activity, but proposal submissions and votes
                are disabled for this account.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={ClipboardList}
            label="Proposal queue"
            value={String(proposals?.length ?? 0)}
            detail="Recent rule-change items"
          />
          <StatusCard icon={Vote} label="Voting" value="0" detail="Open ballots" />
          <StatusCard
            icon={Crown}
            label="Role"
            value={member?.is_admin ? "Admin" : "Member"}
            detail={member?.is_admin ? "Commissioner controls enabled" : "Standard access"}
          />
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-[#d9decf] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Proposals</h1>
                <p className="mt-1 text-sm leading-6 text-[#626b59]">
                  Submitted rule changes will move through commissioner review,
                  voting, and published results here.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {proposals?.length ? (
                proposals.map((proposal) => (
                  <article
                    key={proposal.id}
                    className="rounded-lg border border-[#e1e5d9] bg-[#fbfcf8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold">{proposal.title}</h2>
                      <span className="rounded-full bg-[#e9eee0] px-2.5 py-1 text-xs font-medium capitalize text-[#3e4a36]">
                        {proposal.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#626b59]">
                      {proposal.summary}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-[#d9decf] bg-[#fbfcf8] p-5">
                  <p className="text-base font-semibold">No proposals yet</p>
                  <p className="mt-2 text-sm leading-6 text-[#626b59]">
                    Once Google Auth is enabled and the submission form is added,
                    league members can send rule changes here for commissioner
                    review.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-lg border border-[#d9decf] bg-[#182214] p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <Clock size={20} aria-hidden="true" />
              <h2 className="text-xl font-semibold">Commissioner setup</h2>
            </div>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-[#dfe8d7]">
              <p>Google sign-in route and callback are wired.</p>
              <p>First sign-in by lleytonito@gmail.com becomes admin.</p>
              <p>RLS blocks revoked members from submitting or voting.</p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function StatusCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#d9decf] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#626b59]">{label}</p>
        <div className="flex size-9 items-center justify-center rounded-md bg-[#e9eee0] text-[#26351f]">
          <Icon size={18} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#626b59]">{detail}</p>
    </div>
  );
}
