import { createZoomMeeting } from './utils/zoom'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables from portal/.env
dotenv.config({ path: join(process.cwd(), 'portal', '.env') })

async function testZoom() {
    console.log('--- Zoom Integration Test ---')

    const accountId = process.env.ZOOM_ACCOUNT_ID?.trim()
    const clientId = process.env.ZOOM_CLIENT_ID?.trim()
    const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim()

    try {
        console.log('Manual Token Request Check:')

        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

        const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`
        console.log('URL:', tokenUrl)

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })

        console.log('Status:', response.status)
        const data = await response.json()

        if (!response.ok) {
            console.log('Error Data:', JSON.stringify(data, null, 2))
            return
        }

        console.log('Token received successfully!')

        // If token works, try creating a meeting using the real utility
        console.log('\nRetrying meeting creation with utility...')
        const meeting = await createZoomMeeting({
            topic: 'Test Mentorship Session',
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            duration: 45,
        })

        console.log('\n✅ Success! Zoom meeting created:')
        console.log('ID:', meeting.id)
        console.log('Join URL:', meeting.joinUrl)

    } catch (error) {
        console.error('\n❌ Test Failed:')
        console.error(error)
    }
}

testZoom()
