import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    // Mutate the same response so we don't lose cookies from previous setAll calls
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refreshing the auth token so it's available to Server Components
    await supabase.auth.getUser();

    return supabaseResponse;
}

/**
 * Read-only lookup of the current user's profile role, used by the maintenance
 * gate in proxy.ts to let admins through. Returns null when there is no session.
 * Does not persist refreshed cookies (updateSession handles token refresh on the
 * paths that are actually served).
 */
export async function getUserRole(request: NextRequest): Promise<string | null> {
    // Fast path: no Supabase auth cookie => no session, skip the network round-trip.
    const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
    if (!hasAuthCookie) return null;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll() {
                    // Intentionally a no-op: this is a read-only role probe.
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    return profile?.role ?? null;
}
