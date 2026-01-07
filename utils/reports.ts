import { createClient } from './supabase/server'
import OpenAI from 'openai'
import { getZoomAccessToken } from './zoom'

/**
 * Clean VTT content to plain text with speaker names
 */
export function parseVTT(vttContent: string): string {
    // Remove WEBVTT header and metadata
    let text = vttContent.replace(/^WEBVTT\n\n/i, '')

    // Remove timestamps and sequence numbers
    // Format:
    // 1
    // 00:00:00.000 --> 00:00:05.000
    // Speaker Name: Text
    text = text.replace(/^\d+$\n/gm, '') // Sequence numbers
    text = text.replace(/^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}$\n/gm, '') // Timestamps

    // Trim extra newlines
    return text.trim().replace(/\n{3,}/g, '\n\n')
}

/**
 * Process a transcript: download, parse, and generate AI report
 */
export async function processTranscript(meetingId: string, downloadUrl: string) {
    const supabase = await createClient()
    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    try {
        console.log(`[REPORTS] Starting process for meeting: ${meetingId}`)

        // 1. Download VTT file
        // Note: Zoom download URLs from webhooks usually require the access token in Bearer auth
        const accessToken = await getZoomAccessToken()
        const response = await fetch(downloadUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to download transcript: ${response.statusText}`)
        }

        const vttContent = await response.text()
        const cleanedTranscript = parseVTT(vttContent)

        // 2. Generate AI Report
        console.log(`[REPORTS] Generating AI report for meeting: ${meetingId}`)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // or your preferred model
            messages: [
                {
                    role: "system",
                    content: "You are an expert AI assistant for a mentorship platform. Your task is to analyze a mentorship session transcript and generate a structured report. Return JSON with 'summary', 'key_points' (array of strings), and 'action_items' (array of strings)."
                },
                {
                    role: "user",
                    content: `Analyze the following transcript and generate a mentorship session report: \n\n ${cleanedTranscript}`
                }
            ],
            response_format: { type: "json_object" }
        })

        const reportData = JSON.parse(completion.choices[0].message.content || '{}')

        // 3. Save to database
        // Get session ID first
        const { data: session, error: fetchError } = await supabase
            .from('sessions')
            .select('id')
            .eq('zoom_meeting_id', meetingId)
            .single()

        if (fetchError || !session) throw new Error('Session not found for transcript')

        const { error: insertError } = await supabase
            .from('session_reports')
            .insert({
                session_id: session.id,
                summary: reportData.summary,
                key_points: reportData.key_points,
                action_items: reportData.action_items,
                raw_transcript: cleanedTranscript
            })

        if (insertError) throw insertError

        console.log(`[REPORTS] Success: Report generated for session ${session.id}`)

    } catch (error) {
        console.error(`[REPORTS] Error processing transcript for ${meetingId}:`, error)
        throw error
    }
}
