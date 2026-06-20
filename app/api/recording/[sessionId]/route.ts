import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getZoomAccessToken, getZoomRecordings } from '@/utils/zoom'

/**
 * GET /api/recording/[sessionId]
 * Streams the Zoom cloud recording (MP4) for a session through our own Zoom
 * OAuth / webhook download token, so students never hit Zoom's passcode gate.
 * Only the session's mentor/student or an admin may access it.
 *
 * Forwards the client's Range header to Zoom so the HTML5 <video> player can
 * seek without buffering the whole file.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { sessionId } = await params
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }

        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = profile && ['admin', 'admin-dev'].includes(profile.role)

        const { data: session } = await adminSupabase
            .from('sessions')
            .select('id, mentor_id, student_id, zoom_meeting_id, recording_download_url, recording_download_token')
            .eq('id', sessionId)
            .single()

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const isParticipant = session.mentor_id === user.id || session.student_id === user.id
        if (!isAdmin && !isParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Resolve a fetchable MP4 URL + auth header.
        // A) Stored webhook download_token (works for webhook_download URLs)
        let fetchUrl: string | null = null
        let authHeader: Record<string, string> = {}

        if (session.recording_download_url && session.recording_download_token) {
            fetchUrl = session.recording_download_url
            authHeader = { Authorization: `Bearer ${session.recording_download_token}` }
        }

        // B) Fall back to the Recordings API + OAuth access token (token in query)
        if (!fetchUrl && session.zoom_meeting_id) {
            const accessToken = await getZoomAccessToken()
            const recordings = await getZoomRecordings(session.zoom_meeting_id)
            const videoFile =
                recordings?.recording_files?.find(
                    (f) => f.file_type === 'MP4' && f.recording_type === 'shared_screen_with_speaker_view'
                ) || recordings?.recording_files?.find((f) => f.file_type === 'MP4')
            if (videoFile?.download_url) {
                const u = new URL(videoFile.download_url)
                u.searchParams.set('access_token', accessToken)
                fetchUrl = u.toString()
            }
        }

        // C) Stored URL alone + OAuth token (last resort)
        if (!fetchUrl && session.recording_download_url) {
            const accessToken = await getZoomAccessToken()
            const sep = session.recording_download_url.includes('?') ? '&' : '?'
            fetchUrl = `${session.recording_download_url}${sep}access_token=${accessToken}`
        }

        if (!fetchUrl) {
            return NextResponse.json({ error: 'No recording available for this session' }, { status: 404 })
        }

        // Forward Range for seekable playback.
        const range = req.headers.get('range')
        const upstream = await fetch(fetchUrl, {
            headers: {
                ...authHeader,
                ...(range ? { Range: range } : {}),
            },
        })

        if (!upstream.ok && upstream.status !== 206) {
            return NextResponse.json({ error: 'Failed to fetch recording from Zoom' }, { status: 502 })
        }

        const headers = new Headers()
        headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
        headers.set('Accept-Ranges', 'bytes')
        const contentLength = upstream.headers.get('content-length')
        if (contentLength) headers.set('Content-Length', contentLength)
        const contentRange = upstream.headers.get('content-range')
        if (contentRange) headers.set('Content-Range', contentRange)
        // Private: do not let shared/CDN caches store the video.
        headers.set('Cache-Control', 'private, max-age=0, no-store')

        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers,
        })
    } catch (error: unknown) {
        console.error('[RECORDING] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
