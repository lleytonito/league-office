import { createServerClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabaseBrowserEnv();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; Proxy refreshes sessions.
          }
        },
      },
    },
  );
}
