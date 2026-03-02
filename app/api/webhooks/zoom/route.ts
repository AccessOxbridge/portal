import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyZoomWebhook } from '@/utils/zoom-webhooks'
import { processTranscript, pollAndProcessTranscript } from '@/utils/reports'

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
        const supabase = createAdminClient()

        if (event === 'meeting.started') {
            const meetingId = payload?.object?.id ?? payload?.payload?.object?.id
            const meetingIdStr = meetingId != null ? String(meetingId) : ''
            console.log(`[ZOOM WEBHOOK] meeting.started — zoom_meeting_id: ${meetingIdStr}`)
            if (!meetingIdStr) {
                console.error('[ZOOM WEBHOOK] meeting.started missing payload.object.id. Payload:', JSON.stringify(payload).slice(0, 500))
            } else {
                const { error: updateError } = await supabase
                    .from('sessions')
                    .update({ zoom_meeting_status: 'started' })
                    .eq('zoom_meeting_id', meetingIdStr)
                if (updateError) {
                    console.error(`[ZOOM WEBHOOK] Failed to set started for ${meetingIdStr}:`, updateError)
                }
            }
        }

        else if (event === 'meeting.ended') {
            const meetingId = payload?.object?.id ?? payload?.payload?.object?.id
            const meetingIdStr = meetingId != null ? String(meetingId) : ''
            console.log(`[ZOOM WEBHOOK] meeting.ended — zoom_meeting_id: ${meetingIdStr}`)
            let session: { id: string; mentor_id: string; student_id: string } | null = null
            if (!meetingIdStr) {
                console.error('[ZOOM WEBHOOK] meeting.ended missing payload.object.id. Payload:', JSON.stringify(payload).slice(0, 500))
            } else {
                const result = await supabase
                    .from('sessions')
                    .update({ zoom_meeting_status: 'ended', status: 'completed' })
                    .eq('zoom_meeting_id', meetingIdStr)
                    .select('id, mentor_id, student_id')
                    .maybeSingle()
                session = result.data
                const updateError = result.error

                if (updateError) {
                    console.error(`[ZOOM WEBHOOK] Failed to mark meeting ended for ${meetingIdStr}:`, updateError)
                } else if (!session) {
                    console.warn(`[ZOOM WEBHOOK] meeting.ended: no session found with zoom_meeting_id=${meetingIdStr}. Check that the webhook meeting id matches sessions.zoom_meeting_id.`)
                }
            }

            if (session) {
                await supabase.from('notifications').insert({
                    recipient_id: session.mentor_id,
                    recipient_email: '',
                    type: 'session_confirmed',
                    title: '📝 Session Report Required',
                    message: 'Please complete your session report to generate the student\'s personalized feedback.',
                    data: { session_id: session.id, action: 'mentor_report' }
                })

                await supabase.from('notifications').insert({
                    recipient_id: session.student_id,
                    recipient_email: '',
                    type: 'session_confirmed',
                    title: '⭐ Share Your Feedback',
                    message: 'Your session has ended! We\'d love to hear about your experience (optional).',
                    data: { session_id: session.id, action: 'student_feedback' }
                })
                
                try {
                    const { data: sess } = await supabase
                        .from('sessions')
                        .select('id, duration_minutes, student_id')
                        .eq('id', session.id)
                        .single()

                    if (sess && sess.student_id) {
                        const durationMinutes = sess.duration_minutes || 60
                        const creditsToDeduct = Math.ceil((durationMinutes || 60) / 60)

                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('credits')
                            .eq('id', sess.student_id)
                            .single()

                        const currentCredits = (profile?.credits as number) || 0
                        const newBalance = Math.max(0, currentCredits - creditsToDeduct)

                        await supabase
                            .from('profiles')
                            .update({ credits: newBalance })
                            .eq('id', sess.student_id)

                        await supabase.from('credit_transactions').insert({
                            user_id: sess.student_id,
                            amount: -creditsToDeduct,
                            balance_after: newBalance,
                            type: 'booking',
                            description: `Auto-deduct credits for session ${sess.id}`,
                            reference_id: sess.id
                        })

                        await supabase.from('notifications').insert({
                            recipient_id: sess.student_id,
                            recipient_email: '',
                            type: 'session_confirmed',
                            title: `Credits deducted for session`,
                            message: `We deducted ${creditsToDeduct} credit${creditsToDeduct !== 1 ? 's' : ''} for your recent session.`,
                            data: { session_id: sess.id, credits_deducted: creditsToDeduct, balance_after: newBalance }
                        })
                    }
                } catch (err) {
                    console.error('[CREDITS] Failed to deduct credits for session:', err)
                }
            }

            // Start background polling as a safety net for transcript retrieval.
            // If the recording.completed or recording.transcript_completed webhook
            // fires first (common), the poller will detect the existing report and exit early.
            if (meetingIdStr) {
                pollAndProcessTranscript(meetingIdStr)
                    .catch((err: any) => console.error('[ZOOM WEBHOOK] Background transcript polling failed:', err))
            }
        }

        // 3. Handle Recording Completed (includes transcript files when available)
        else if (event === 'recording.completed') {
            const meetingId = payload?.object?.id
            const meetingIdStr = meetingId != null ? String(meetingId) : ''
            const downloadToken = body.download_token

            if (meetingIdStr && payload?.object?.recording_files) {
                const transcriptFile = payload.object.recording_files.find(
                    (file: any) => file.file_type === 'TRANSCRIPT' || file.recording_type === 'audio_transcript'
                )

                if (transcriptFile && downloadToken) {
                    console.log(`[ZOOM WEBHOOK] recording.completed has transcript for meeting: ${meetingIdStr}`)

                    await supabase
                        .from('sessions')
                        .update({ transcript_url: transcriptFile.download_url })
                        .eq('zoom_meeting_id', meetingIdStr)

                    processTranscript(meetingIdStr, transcriptFile.download_url, downloadToken)
                        .catch((err: any) => console.error('[ZOOM WEBHOOK] recording.completed transcript processing failed:', err))
                } else {
                    console.log(`[ZOOM WEBHOOK] recording.completed for ${meetingIdStr} — no transcript file yet`)
                }
            }
        }

        // 4. Handle Transcription Completed (dedicated event, can be unreliable)
        else if (event === 'recording.transcript_completed') {
            const meetingId = payload.object.id
            const meetingIdStr = String(meetingId)
            const downloadToken = body.download_token
            const transcriptFile = payload.object.recording_files?.find(
                (file: any) => file.file_type === 'TRANSCRIPT'
            )

            if (transcriptFile) {
                console.log(`[ZOOM WEBHOOK] Transcript ready for meeting: ${meetingId}`)

                await supabase
                    .from('sessions')
                    .update({ transcript_url: transcriptFile.download_url })
                    .eq('zoom_meeting_id', meetingIdStr)

                processTranscript(meetingIdStr, transcriptFile.download_url, downloadToken)
                    .catch((err: any) => console.error('[ZOOM WEBHOOK] Transcript processing failed:', err))
            }
        } else {
            console.log(`[ZOOM WEBHOOK] Unhandled event: ${event}. Payload keys: ${payload ? Object.keys(payload).join(', ') : 'none'}`)
        }

        return NextResponse.json({ message: 'Received' }, { status: 200 })
    } catch (error: any) {
        console.error('[ZOOM WEBHOOK] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
