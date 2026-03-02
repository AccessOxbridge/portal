/**
 * Zoom API Integration
 * Server-to-Server OAuth for creating scheduled meetings,
 * ensuring audio transcription is enabled, and polling for recordings.
 */

interface ZoomTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
}

interface ZoomMeetingResponse {
    id: number
    join_url: string
    start_url: string
    topic: string
    start_time: string
}

interface CreateMeetingParams {
    topic: string
    startTime: Date
    duration?: number // in minutes, default 60
    timezone?: string
}

export interface ZoomRecordingFile {
    id: string
    recording_type: string
    file_type: string
    download_url: string
    status: string
}

export interface ZoomRecordingResponse {
    id: number
    uuid: string
    recording_files: ZoomRecordingFile[]
}

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getZoomAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
        return cachedToken.token
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID
    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET

    if (!accountId || !clientId || !clientSecret) {
        throw new Error('Missing Zoom credentials. Ensure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET are set.')
    }

    const credentials = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64')

    const response = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    )

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to get Zoom access token: ${error}`)
    }

    const data: ZoomTokenResponse = await response.json()

    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    }

    return data.access_token
}

/**
 * Ensure audio transcription is enabled for the Zoom user's cloud recordings.
 * This is a prerequisite for Zoom to generate transcript (VTT) files automatically.
 * Called once during meeting creation; safe to call repeatedly (idempotent PATCH).
 */
export async function ensureAudioTranscriptionEnabled(): Promise<void> {
    try {
        const accessToken = await getZoomAccessToken()

        const response = await fetch('https://api.zoom.us/v2/users/me/settings', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recording: {
                    cloud_recording: true,
                    recording_audio_transcript: true,
                },
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            console.warn(`[ZOOM] Could not enable audio transcription (non-fatal): ${error}`)
        } else {
            console.log('[ZOOM] Audio transcription setting confirmed enabled')
        }
    } catch (err) {
        console.warn('[ZOOM] Failed to ensure audio transcription (non-fatal):', err)
    }
}

export async function createZoomMeeting(params: CreateMeetingParams): Promise<{
    id: string
    joinUrl: string
    startUrl: string
}> {
    const { topic, startTime, duration = 60, timezone = 'UTC' } = params

    // Best-effort: ensure the user has audio transcription enabled
    await ensureAudioTranscriptionEnabled()

    const accessToken = await getZoomAccessToken()

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic,
            type: 2,
            start_time: startTime.toISOString(),
            duration,
            timezone,
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: true,
                waiting_room: false,
                audio: 'both',
                auto_recording: 'cloud',
            },
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to create Zoom meeting: ${error}`)
    }

    const data: ZoomMeetingResponse = await response.json()

    return {
        id: String(data.id),
        joinUrl: data.join_url,
        startUrl: data.start_url,
    }
}

/**
 * Fetch recordings for a past meeting from Zoom's API.
 * Used as a polling fallback when webhooks don't fire.
 */
export async function getZoomRecordings(meetingId: string): Promise<ZoomRecordingResponse | null> {
    try {
        const accessToken = await getZoomAccessToken()

        const response = await fetch(
            `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            }
        )

        if (!response.ok) {
            if (response.status === 404) return null
            const error = await response.text()
            console.warn(`[ZOOM] Failed to fetch recordings for ${meetingId}: ${error}`)
            return null
        }

        return await response.json()
    } catch (err) {
        console.error(`[ZOOM] Error fetching recordings for ${meetingId}:`, err)
        return null
    }
}
