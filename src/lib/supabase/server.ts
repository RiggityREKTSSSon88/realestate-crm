import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  // Cast needed due to moduleResolution:"bundler" generic inference issue with @supabase/ssr
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
