import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { verifyZoomWebhook } from '@/utils/zoom-webhooks'
import { processTranscript } from '@/utils/reports'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { event, payload } = body

        console.log(`[ZOOM WEBHOOK] Received event: ${event}`)

        // 1. Handle URL Validation (Initial Setup)
        if (event === 'endpoint.url_validation') {
            const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN
            if (!secretToken) {
                console.error('ZOOM_WEBHOOK_SECRET_TOKEN is not set')
                return NextResponse.json({ error: 'Config error' }, { status: 500 })
            }

            const response = verifyZoomWebhook(secretToken, event, payload.plainToken)
            return NextResponse.json(response, { status: 200 })
        }

        // 2. Handle Meeting Events
        const supabase = await createClient()

        if (event === 'meeting.started') {
            const meetingId = payload.object.id
            await supabase
                .from('sessions')
                .update({ zoom_meeting_status: 'started' })
                .eq('zoom_meeting_id', meetingId.toString())
        }

        else if (event === 'meeting.ended') {
            const meetingId = payload.object.id
            await supabase
                .from('sessions')
                .update({ zoom_meeting_status: 'ended' })
                .eq('zoom_meeting_id', meetingId.toString())
        }

        // 3. Handle Transcription Completed
        else if (event === 'recording.transcript_completed') {
            const meetingId = payload.object.id
            const transcriptFile = payload.object.recording_files.find(
                (file: any) => file.file_type === 'TRANSCRIPT'
            )

            if (transcriptFile) {
                console.log(`[ZOOM WEBHOOK] Transcript ready for meeting: ${meetingId}`)

                // Update session with transcript URL
                await supabase
                    .from('sessions')
                    .update({ transcript_url: transcriptFile.download_url })
                    .eq('zoom_meeting_id', meetingId.toString())

                // Trigger AI processing (background)
                // We don't await this to respond to Zoom quickly (within 3s)
                processTranscript(meetingId.toString(), transcriptFile.download_url)
                    .catch((err: any) => console.error('[ZOOM WEBHOOK] Transcript processing failed:', err))
            }
        }

        return NextResponse.json({ message: 'Received' }, { status: 200 })
    } catch (error: any) {
        console.error('[ZOOM WEBHOOK] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
