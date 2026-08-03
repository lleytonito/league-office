"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function signOut() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isLoading}
      className="flex size-10 items-center justify-center rounded-md border border-[#d9decf] bg-white text-[#3e4a36] transition hover:bg-[#eef2e8] disabled:opacity-70"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut size={18} aria-hidden="true" />
    </button>
  );
}
