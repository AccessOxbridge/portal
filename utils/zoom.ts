/**
 * Zoom API Integration
 * Server-to-Server OAuth for creating scheduled meetings
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

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get Zoom access token using Server-to-Server OAuth
 */
export async function getZoomAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
        return cachedToken.token
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID
    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET

    if (!accountId || !clientId || !clientSecret) {
        throw new Error('Missing Zoom credentials. Ensure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET are set.')
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

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

    // Cache the token
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    }

    return data.access_token
}

/**
 * Create a scheduled Zoom meeting
 */
export async function createZoomMeeting(params: CreateMeetingParams): Promise<{
    id: string
    joinUrl: string
    startUrl: string
}> {
    const { topic, startTime, duration = 60, timezone = 'UTC' } = params

    const accessToken = await getZoomAccessToken()

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic,
            type: 2, // Scheduled meeting
            start_time: startTime.toISOString(),
            duration,
            timezone,
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: true,
                waiting_room: false,
                audio: 'both',
                auto_recording: 'cloud', // Record to cloud for session reports
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
