"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Trophy } from "lucide-react";

export function LoginWall() {
  return (
    <main className="min-h-dvh bg-[#f7f8f4] text-[#151712]">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#182214] text-white">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3e4a36]">
              League Office
            </span>
          </div>
        </header>

        <div className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-6">
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-normal text-[#11130f] sm:text-6xl">
              League Office.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[#596153]">
              Sign in to view the feed, vote on proposals, and check league history.
            </p>
          </div>

          <div className="rounded-lg border border-[#d9decf] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Sign in</h2>

            <GoogleSignInButton className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-md bg-[#182214] px-4 text-sm font-semibold text-white transition hover:bg-[#26351f] disabled:cursor-not-allowed disabled:opacity-70" />
          </div>
        </div>
      </section>
    </main>
  );
}
