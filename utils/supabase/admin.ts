import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

/**
 * Supabase Admin client using the SERVICE_ROLE_KEY.
 * This client bypasses Row Level Security (RLS).
 * ONLY use this in server-side contexts like cron jobs or internal APIs.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase admin environment variables.");
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
