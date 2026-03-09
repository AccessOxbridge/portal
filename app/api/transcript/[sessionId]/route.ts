import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getZoomAccessToken, getZoomRecordings } from '@/utils/zoom'
import { parseVTT } from '@/utils/reports'

/**
 * GET /api/transcript/[sessionId]
 * Returns transcript content for a session. Uses our Zoom OAuth to fetch
 * when needed, avoiding Zoom's passcode gate for direct links.
 */
export async function GET(
    _req: Request,
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
            .select('id, mentor_id, student_id, zoom_meeting_id, transcript_url, transcript_download_token')
            .eq('id', sessionId)
            .single()

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const isParticipant = session.mentor_id === user.id || session.student_id === user.id
        if (!isAdmin && !isParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 1. Prefer stored transcript from session_reports
        const { data: report } = await adminSupabase
            .from('session_reports')
            .select('raw_transcript')
            .eq('session_id', sessionId)
            .maybeSingle()

        if (report?.raw_transcript) {
            return new NextResponse(report.raw_transcript, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                },
            })
        }

        // 2. Fetch from Zoom: prefer stored webhook download_token, then Recordings API, then stored URL + OAuth
        const zoomMeetingId = session.zoom_meeting_id
        const storedTranscriptUrl = session.transcript_url
        const storedDownloadToken = session.transcript_download_token

        if (!zoomMeetingId && !storedTranscriptUrl) {
            return NextResponse.json({ error: 'No recording for this session' }, { status: 404 })
        }

        const accessToken = await getZoomAccessToken()
        let vttContent: string | null = null
        let response: Response | null = null

        // A) Stored webhook download_token (works for webhook_download URLs)
        if (storedTranscriptUrl && storedDownloadToken) {
            response = await fetch(storedTranscriptUrl, {
                headers: { 'Authorization': `Bearer ${storedDownloadToken}` },
            })
            if (response.ok) vttContent = await response.text()
        }

        // B) Zoom Recordings API (OAuth)
        if (!vttContent && zoomMeetingId) {
            const recordings = await getZoomRecordings(zoomMeetingId)
            const transcriptFile = recordings?.recording_files?.find(
                (f) => f.recording_type === 'audio_transcript' || f.file_type === 'TRANSCRIPT'
            )
            if (transcriptFile?.download_url) {
                const u = new URL(transcriptFile.download_url)
                u.searchParams.set('access_token', accessToken)
                response = await fetch(u.toString())
                if (response.ok) vttContent = await response.text()
            }
        }

        // C) Stored URL + OAuth (query param or Bearer)
        if (!vttContent && storedTranscriptUrl) {
            try {
                const u = new URL(storedTranscriptUrl)
                u.searchParams.set('access_token', accessToken)
                response = await fetch(u.toString())
            } catch {
                response = await fetch(`${storedTranscriptUrl}${storedTranscriptUrl.includes('?') ? '&' : '?'}access_token=${accessToken}`)
            }
            if (response?.ok) vttContent = await response.text()
            if (!vttContent && response?.status === 401) {
                response = await fetch(storedTranscriptUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                })
                if (response.ok) vttContent = await response.text()
            }
        }

        if (!vttContent || vttContent.includes('<!DOCTYPE') || vttContent.includes('Enter the passcode') || vttContent.includes('<html')) {
            return NextResponse.json(
                vttContent
                    ? { error: 'Transcript requires passcode; Zoom settings may restrict access' }
                    : { error: 'Failed to fetch transcript from Zoom' },
                { status: 502 }
            )
        }

        const plainText = parseVTT(vttContent)

        // Backfill session_reports.raw_transcript so future requests don't need Zoom
        const { data: existingReport } = await adminSupabase
            .from('session_reports')
            .select('id')
            .eq('session_id', sessionId)
            .maybeSingle()
        if (existingReport && plainText) {
            await adminSupabase
                .from('session_reports')
                .update({ raw_transcript: plainText })
                .eq('session_id', sessionId)
        }

        return new NextResponse(plainText || '(No transcript content)', {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        })
    } catch (error: unknown) {
        console.error('[TRANSCRIPT] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
