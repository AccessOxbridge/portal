import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * For the routes under /api/parent: the signed-in user, if they are a parent.
 * Checked with the caller's own RLS-respecting client; routes then write with
 * the service role, scoped to this id.
 */
export async function requireParentApi(): Promise<{ userId: string } | { response: NextResponse }> {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()
    if (error || !user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'parent') return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

    return { userId: user.id }
}
