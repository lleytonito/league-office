"use client";

import { createClient } from "@/lib/supabase/client";
import { CircleUserRound, Loader2 } from "lucide-react";
import { useState } from "react";

export function GoogleSignInButton({
  className = "",
  label = "Continue with Google",
  shortLabel,
}: {
  className?: string;
  label?: string;
  shortLabel?: string;
}) {
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
    <div className="grid gap-2">
      <button
        className={className}
        disabled={isLoading}
        onClick={signInWithGoogle}
        type="button"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
        ) : (
          <CircleUserRound size={18} aria-hidden="true" />
        )}
        {shortLabel ? (
          <>
            <span className="hidden min-[360px]:inline">{label}</span>
            <span className="min-[360px]:hidden">{shortLabel}</span>
          </>
        ) : (
          label
        )}
      </button>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
