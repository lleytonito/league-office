import { AppHeader } from "@/components/layout/app-header";
import {
  basicSettings,
  divisions,
  draftSettings,
  leagueRuleSections,
  rosterRules,
  rosterSummary,
  scoringGroups,
  type RuleItem,
} from "@/lib/rules/last-year";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, CalendarDays, ListChecks, ScrollText, ShieldCheck, Table2 } from "lucide-react";
import Link from "next/link";

type Member = {
  display_name: string;
  is_admin: boolean;
  team_name: string | null;
};

export const metadata = {
  title: "Last Year's Rules | League Office",
};

export default async function RulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("league_members")
        .select("display_name, team_name, is_admin")
        .eq("auth_user_id", user.id)
        .maybeSingle<Member>()
    : { data: null };

  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#111411]">
      <AppHeader member={member} userEmail={user?.email ?? null} />

      <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-4 sm:px-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3e4a36]" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Feed
        </Link>

        <header className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#183a2b] text-white">
              <ScrollText size={21} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold leading-tight">Last Year&apos;s Rules</h1>
              <p className="mt-2 text-sm leading-6 text-[#626b59]">
                Static ESPN League Manager settings from last season, collected here so members can
                compare proposals against the current baseline.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <RuleCard icon={ShieldCheck} items={basicSettings} title="Basic Settings" />
          <RuleCard icon={CalendarDays} items={draftSettings} title="Draft Settings" />
        </div>

        <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Table2 className="text-[#587246]" size={19} aria-hidden="true" />
            <h2 className="text-2xl font-semibold">Roster</h2>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            {rosterSummary.map((item) => (
              <div className="rounded-[8px] bg-[#f7f8f4] p-3" key={item.label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a725f]">
                  {item.label}
                </dt>
                <dd className="mt-1 text-base font-semibold text-[#293421]">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 overflow-hidden rounded-[10px] border border-[#e1e5d9]">
            <div className="grid grid-cols-[1fr_76px_88px] bg-[#183a2b] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white">
              <span>Position</span>
              <span className="text-right">Start</span>
              <span className="text-right">Max</span>
            </div>
            <div className="divide-y divide-[#e8ebdf] bg-white">
              {rosterRules.map((rule) => (
                <div
                  className="grid grid-cols-[1fr_76px_88px] gap-2 px-3 py-2 text-sm"
                  key={rule.position}
                >
                  <span className="min-w-0 text-[#293421]">{rule.position}</span>
                  <span className="text-right font-semibold text-[#293421]">{rule.starters}</span>
                  <span className="text-right text-[#626b59]">{rule.maximum}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ListChecks className="text-[#587246]" size={19} aria-hidden="true" />
            <h2 className="text-2xl font-semibold">Scoring</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {scoringGroups.map((group) => (
              <details
                className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4 open:bg-white"
                key={group.title}
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-[#293421] [&::-webkit-details-marker]:hidden">
                  {group.title}
                  <span className="ml-2 text-xs font-semibold text-[#6a725f]">
                    {group.items.length} rules
                  </span>
                </summary>
                <RuleList items={group.items} />
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-semibold">Teams and Divisions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {divisions.map((division) => (
              <div className="rounded-[10px] border border-[#e1e5d9] bg-[#fbfcf8] p-4" key={division.title}>
                <h3 className="text-base font-semibold text-[#293421]">{division.title}</h3>
                <ul className="mt-3 grid gap-2 text-sm text-[#4e5a45]">
                  {division.teams.map((team) => (
                    <li className="rounded-md bg-white px-3 py-2" key={team}>
                      {team}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {leagueRuleSections.map((section) => (
            <RuleCard items={section.items} key={section.title} title={section.title} />
          ))}
        </div>
      </section>
    </main>
  );
}

function RuleCard({
  icon: Icon,
  items,
  title,
}: {
  icon?: typeof ShieldCheck;
  items: RuleItem[];
  title: string;
}) {
  return (
    <section className="rounded-[10px] border border-[#d9decf] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="text-[#587246]" size={19} aria-hidden="true" /> : null}
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <RuleList items={items} />
    </section>
  );
}

function RuleList({ items }: { items: RuleItem[] }) {
  return (
    <dl className="mt-4 grid gap-2">
      {items.map((item) => (
        <div
          className="grid gap-1 rounded-[8px] bg-[#f7f8f4] px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
          key={item.label}
        >
          <dt className="text-sm leading-5 text-[#4e5a45]">{item.label}</dt>
          <dd className="text-sm font-semibold text-[#293421] sm:text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
