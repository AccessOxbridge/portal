import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
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
        const supabase = createAdminClient()

        if (event === 'meeting.started') {
            const meetingId = payload.object.id
            const meetingIdStr = String(meetingId)
            await supabase
                .from('sessions')
                .update({ zoom_meeting_status: 'started' })
                .eq('zoom_meeting_id', meetingIdStr)
        }

        else if (event === 'meeting.ended') {
            const meetingId = payload.object.id
            const meetingIdStr = String(meetingId)

            // Update session status
            const { data: session, error: updateError } = await supabase
                .from('sessions')
                .update({ zoom_meeting_status: 'ended', status: 'completed' })
                .eq('zoom_meeting_id', meetingIdStr)
                .select('id, mentor_id, student_id')
                .maybeSingle()

            if (updateError) {
                console.error(`[ZOOM WEBHOOK] Failed to mark meeting ended for ${meetingIdStr}:`, updateError)
            }

            // Send notifications for form filling
            if (session) {
                // Notify mentor (mandatory report)
                await supabase.from('notifications').insert({
                    recipient_id: session.mentor_id,
                    recipient_email: '', // Will be fetched by notification system
                    type: 'session_confirmed', // Reusing existing type
                    title: '📝 Session Report Required',
                    message: 'Please complete your session report to generate the student\'s personalized feedback.',
                    data: { session_id: session.id, action: 'mentor_report' }
                })

                // Notify student (optional feedback)
                await supabase.from('notifications').insert({
                    recipient_id: session.student_id,
                    recipient_email: '',
                    type: 'session_confirmed',
                    title: '⭐ Share Your Feedback',
                    message: 'Your session has ended! We\'d love to hear about your experience (optional).',
                    data: { session_id: session.id, action: 'student_feedback' }
                })
                
                // Deduct student credits based on scheduled duration (1 credit = 60 minutes).
                // Business rule: round up partial hours to the nearest whole credit.
                try {
                    const { data: sess } = await supabase
                        .from('sessions')
                        .select('id, duration_minutes, student_id')
                        .eq('id', session.id)
                        .single()

                    if (sess && sess.student_id) {
                        const durationMinutes = sess.duration_minutes || 60
                        const creditsToDeduct = Math.ceil((durationMinutes || 60) / 60)

                        // Get current credits
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('credits')
                            .eq('id', sess.student_id)
                            .single()

                        const currentCredits = (profile?.credits as number) || 0
                        const newBalance = Math.max(0, currentCredits - creditsToDeduct)

                        // Update student credits (service role allowed)
                        await supabase
                            .from('profiles')
                            .update({ credits: newBalance })
                            .eq('id', sess.student_id)

                        // Insert credit transaction record
                        await supabase.from('credit_transactions').insert({
                            user_id: sess.student_id,
                            amount: -creditsToDeduct,
                            balance_after: newBalance,
                            type: 'booking',
                            description: `Auto-deduct credits for session ${sess.id}`,
                            reference_id: sess.id
                        })

                        // Notify student about deduction
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
        }

        // 3. Handle Transcription Completed
        else if (event === 'recording.transcript_completed') {
            const meetingId = payload.object.id
            const meetingIdStr = String(meetingId)
            const downloadToken = body.download_token // Extract from webhook body
            const transcriptFile = payload.object.recording_files.find(
                (file: any) => file.file_type === 'TRANSCRIPT'
            )

            if (transcriptFile) {
                console.log(`[ZOOM WEBHOOK] Transcript ready for meeting: ${meetingId}`)

                // Update session with transcript URL
                await supabase
                    .from('sessions')
                    .update({ transcript_url: transcriptFile.download_url })
                    .eq('zoom_meeting_id', meetingIdStr)

                // Trigger AI processing (background)
                // We don't await this to respond to Zoom quickly (within 3s)
                processTranscript(meetingIdStr, transcriptFile.download_url, downloadToken)
                    .catch((err: any) => console.error('[ZOOM WEBHOOK] Transcript processing failed:', err))
            }
        }

        return NextResponse.json({ message: 'Received' }, { status: 200 })
    } catch (error: any) {
        console.error('[ZOOM WEBHOOK] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
