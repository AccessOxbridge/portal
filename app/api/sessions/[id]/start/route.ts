import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getZoomStartUrl } from '@/utils/zoom'

// Always run fresh: each request mints a new, short-lived Zoom host token.
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions/[id]/start
 *
 * Mentor-only. Mints a fresh Zoom host `start_url` for the session and
 * redirects the mentor straight into the meeting as host. We generate the
 * start_url on demand (rather than reusing the one stored at booking time)
 * because Zoom's start_url host token expires ~2 hours after creation.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    if (!id) {
        return NextResponse.json({ error: 'Session id required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Logged-out (e.g. clicking the link from a reminder email): send them to
    // sign in rather than returning a bare 401. After login they can start the
    // session from the dashboard, which generates a fresh link the same way.
    if (!user) {
        return NextResponse.redirect(new URL('/login', _req.url))
    }

    const adminSupabase = createAdminClient()
    const { data: session } = await adminSupabase
        .from('sessions')
        .select('id, mentor_id, zoom_meeting_id, zoom_start_url')
        .eq('id', id)
        .single()

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only the assigned mentor may start the meeting as host.
    if (session.mentor_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!session.zoom_meeting_id) {
        return NextResponse.json(
            { error: 'No Zoom meeting is linked to this session yet.' },
            { status: 409 }
        )
    }

    // Mint a fresh host start_url; fall back to the stored one only if the
    // live fetch fails (e.g. transient Zoom outage).
    const freshStartUrl = await getZoomStartUrl(session.zoom_meeting_id)
    const startUrl = freshStartUrl || session.zoom_start_url

    if (!startUrl) {
        return NextResponse.json(
            { error: 'Could not generate a Zoom start link. Please try again shortly.' },
            { status: 502 }
        )
    }

    const res = NextResponse.redirect(startUrl)
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
}
