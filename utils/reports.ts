import { createAdminClient } from './supabase/admin'
import { getZoomAccessToken, getZoomRecordings } from './zoom'
import OpenAI from 'openai'
import { sanitizeReportContent } from '@/lib/report-utils'

export function parseVTT(vttContent: string): string {
    let text = vttContent.replace(/^WEBVTT\n\n/i, '')

    text = text.replace(/^\d+$\n/gm, '')
    text = text.replace(/^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}$\n/gm, '')

    return text.trim().replace(/\n{3,}/g, '\n\n')
}

/**
 * Check if a session_report already exists for a given meeting so we
 * don't duplicate work across multiple webhook events or polling retries.
 */
async function reportAlreadyExists(meetingId: string): Promise<boolean> {
    const supabase = createAdminClient()
    const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('zoom_meeting_id', meetingId)
        .single()

    if (!session) return false

    const { data: report } = await supabase
        .from('session_reports')
        .select('id')
        .eq('session_id', session.id)
        .maybeSingle()

    return !!report
}

/**
 * Core logic: given a VTT string + meeting ID, generate AI report and persist.
 */
async function generateAndSaveReport(meetingId: string, vttContent: string) {
    const supabase = createAdminClient()
    const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY })

    const cleanedTranscript = parseVTT(vttContent)
    if (!cleanedTranscript || cleanedTranscript.length < 20) {
        console.warn(`[REPORTS] Transcript too short for meeting ${meetingId}, skipping AI report`)
        return
    }

    console.log(`[REPORTS] Generating AI report for meeting: ${meetingId}`)
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content:
                    'You are an expert education consultant for a mentorship platform. Your task is to generate a structured report about the session. Do not mention any transcripts, recordings, video platforms, or how the information was obtained. Return JSON with \'summary\', \'key_points\' (array of strings), and \'action_items\' (array of strings).',
            },
            {
                role: 'user',
                content: `Generate a mentorship session report based on the following session dialogue. Do not mention the source. \n\n ${cleanedTranscript}`,
            },
        ],
        response_format: { type: 'json_object' },
    })

    const reportData = JSON.parse(completion.choices[0].message.content || '{}')
    const safeSummary = sanitizeReportContent(String(reportData?.summary ?? '')).trim()
    const safeKeyPoints = Array.isArray(reportData?.key_points)
        ? reportData.key_points.map((x: any) => sanitizeReportContent(String(x ?? '')).trim()).filter(Boolean)
        : []
    const safeActionItems = Array.isArray(reportData?.action_items)
        ? reportData.action_items.map((x: any) => sanitizeReportContent(String(x ?? '')).trim()).filter(Boolean)
        : []

    console.log(`[REPORTS] Looking up session for zoom_meeting_id: ${meetingId}`)
    const { data: session, error: fetchError } = await supabase
        .from('sessions')
        .select('id')
        .eq('zoom_meeting_id', meetingId.toString())
        .single()

    if (fetchError || !session) {
        console.error(`[REPORTS] No session found for zoom_meeting_id: ${meetingId}`, fetchError)
        throw new Error('Session not found for transcript')
    }

    const { error: insertError } = await supabase
        .from('session_reports')
        .insert({
            session_id: session.id,
            summary: safeSummary || null,
            key_points: safeKeyPoints,
            action_items: safeActionItems,
            raw_transcript: cleanedTranscript,
        })

    if (insertError) throw insertError

    console.log(`[REPORTS] Success: Report generated for session ${session.id}`)
}

/**
 * Process transcript from a webhook-provided download URL + token.
 * Used by recording.transcript_completed and recording.completed webhooks.
 */
export async function processTranscript(meetingId: string, downloadUrl: string, downloadToken: string) {
    try {
        console.log(`[REPORTS] Starting webhook-triggered process for meeting: ${meetingId}`)
        if (await reportAlreadyExists(meetingId)) {
            console.log(`[REPORTS] Report already exists for meeting ${meetingId}, skipping`)
            return
        }

        console.log(`[REPORTS] Downloading transcript via webhook token`)
        const response = await fetch(downloadUrl, {
            headers: { 'Authorization': `Bearer ${downloadToken}` },
        })

        if (!response.ok) {
            console.error(`[REPORTS] Download failed: ${response.status} ${response.statusText}`)
            throw new Error(`Failed to download transcript: ${response.status} ${response.statusText}`)
        }

        const vttContent = await response.text()
        await generateAndSaveReport(meetingId, vttContent)
    } catch (error) {
        console.error(`[REPORTS] Error processing transcript for ${meetingId}:`, error)
        throw error
    }
}

/**
 * Poll Zoom recordings API and process transcript if available.
 * Fallback for when recording.transcript_completed webhook doesn't fire.
 *
 * Retries with exponential backoff: 2min, 5min, 10min, 20min, 40min
 * (transcripts can take up to 2x the meeting duration to be available).
 */
export async function pollAndProcessTranscript(meetingId: string) {
    const delays = [2 * 60_000, 5 * 60_000, 10 * 60_000, 20 * 60_000, 40 * 60_000]

    for (let attempt = 0; attempt < delays.length; attempt++) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]))

        console.log(`[REPORTS] Polling attempt ${attempt + 1}/${delays.length} for meeting ${meetingId}`)

        if (await reportAlreadyExists(meetingId)) {
            console.log(`[REPORTS] Report was created by webhook while polling — done`)
            return
        }

        const recordings = await getZoomRecordings(meetingId)
        if (!recordings?.recording_files) continue

        const transcriptFile = recordings.recording_files.find(
            (f) => f.recording_type === 'audio_transcript' || f.file_type === 'TRANSCRIPT'
        )

        if (!transcriptFile) {
            console.log(`[REPORTS] No transcript file found yet for meeting ${meetingId}`)
            continue
        }

        try {
            const accessToken = await getZoomAccessToken()
            let downloadUrl: string
            try {
                const parsed = new URL(transcriptFile.download_url)
                parsed.searchParams.set('access_token', accessToken)
                downloadUrl = parsed.toString()
            } catch {
                downloadUrl = `${transcriptFile.download_url}?access_token=${accessToken}`
            }

            const response = await fetch(downloadUrl)
            if (!response.ok) {
                console.warn(`[REPORTS] Transcript download failed (attempt ${attempt + 1}): ${response.status}`)
                continue
            }

            const vttContent = await response.text()

            const supabase = createAdminClient()
            await supabase
                .from('sessions')
                .update({ transcript_url: transcriptFile.download_url })
                .eq('zoom_meeting_id', meetingId)

            await generateAndSaveReport(meetingId, vttContent)
            console.log(`[REPORTS] Polling: successfully processed transcript for meeting ${meetingId}`)
            return
        } catch (err) {
            console.error(`[REPORTS] Polling attempt ${attempt + 1} failed for ${meetingId}:`, err)
        }
    }

    console.error(`[REPORTS] All polling attempts exhausted for meeting ${meetingId}`)
}
