"use client";

import { createClient } from "@/lib/supabase/client";
import { CircleUserRound, Loader2, Trophy } from "lucide-react";
import { useState } from "react";

export function LoginWall() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    }
  }

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
              League business, handled cleanly.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[#596153]">
              Sign in to review proposals, cast votes, and keep every rule
              change tied to a league member.
            </p>
          </div>

          <div className="rounded-lg border border-[#d9decf] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-[#596153]">
              Google login creates your member profile automatically. The
              commissioner can revoke access if someone outside the league gets
              in.
            </p>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-md bg-[#182214] px-4 text-sm font-semibold text-white transition hover:bg-[#26351f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <CircleUserRound size={18} aria-hidden="true" />
              )}
              Continue with Google
            </button>

            {error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
