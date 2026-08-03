import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  BarChart3,
  ClipboardList,
  Menu,
  Shield,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type HeaderMember = {
  display_name: string;
  is_admin: boolean;
  team_name: string | null;
} | null;

export function AppHeader({
  member,
  userEmail,
}: {
  member: HeaderMember;
  userEmail: string | null;
}) {
  const isSignedIn = Boolean(member);

  return (
    <header className="sticky top-0 z-10 -mx-4 border-b border-[#e1e5d9]/80 bg-[#f7f8f4]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#183a2b] text-white shadow-sm">
            <Trophy size={21} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-[#293421]">
              League Office
            </p>
            <p className="truncate text-sm text-[#6a725f]">
              {member?.team_name ?? member?.display_name ?? userEmail ?? "Public feed"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {!isSignedIn ? (
            <GoogleSignInButton
              className="hidden h-10 items-center justify-center gap-2 rounded-full bg-[#183a2b] px-4 text-sm font-semibold text-white transition hover:bg-[#26523e] disabled:opacity-60 sm:flex"
              label="Sign in with Google"
            />
          ) : null}

          <details className="relative">
            <summary
              aria-label="Open navigation menu"
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#d9decf] bg-white text-[#293421] shadow-sm transition hover:bg-[#eef2e8] [&::-webkit-details-marker]:hidden"
            >
              <Menu size={19} aria-hidden="true" />
            </summary>
            <nav className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-[#d9decf] bg-white shadow-xl shadow-[#1c2c1812]">
              <MenuLink href="/submit" icon={ClipboardList} label="Submit proposal" />
              <MenuLink href="/members" icon={UsersRound} label="Members" />
              <MenuLink href="/analytics" icon={BarChart3} label="Analytics" />
              <MenuLink href="/profile" icon={UserRound} label="Profile" />
              {member?.is_admin ? <MenuLink href="/admin" icon={Shield} label="Admin" /> : null}
              {isSignedIn ? (
                <div className="border-t border-[#e8ebdf] p-2">
                  <SignOutButton
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d9decf] bg-white px-3 text-sm font-semibold text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:opacity-70"
                    label="Sign out"
                  />
                </div>
              ) : (
                <div className="border-t border-[#e8ebdf] p-2 sm:hidden">
                  <GoogleSignInButton
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#183a2b] px-3 text-sm font-semibold text-white disabled:opacity-60"
                    label="Sign in with Google"
                    shortLabel="Sign in"
                  />
                </div>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-[#293421] transition hover:bg-[#f4f8ef]"
      href={href}
    >
      <Icon className="text-[#587246]" size={17} aria-hidden="true" />
      {label}
    </Link>
  );
}
