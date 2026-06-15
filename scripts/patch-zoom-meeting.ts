/**
 * One-off: flip an existing Zoom meeting to `join_before_host: false` so
 * students can't enter before the mentor starts it. Useful for re-testing a
 * meeting that was created before the code change.
 *
 *   bun run scripts/patch-zoom-meeting.ts <meetingId>
 *
 * Reads ZOOM_* creds from .env.local (Bun auto-loads it). GETs the meeting
 * before and after so you can see whether the setting actually took (if it
 * still reads `true` afterwards, your Zoom account is forcing it on).
 */
import { getZoomAccessToken } from '../utils/zoom'

const meetingId = process.argv[2] || '83461052632'

async function getSettings(token: string) {
    const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`GET meeting failed: ${res.status} ${await res.text()}`)
    const data = await res.json()
    return {
        join_before_host: data.settings?.join_before_host,
        waiting_room: data.settings?.waiting_room,
    }
}

async function main() {
    const token = await getZoomAccessToken()

    console.log(`Meeting ${meetingId} — before:`, await getSettings(token))

    const patch = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            settings: { join_before_host: false, waiting_room: false },
        }),
    })

    if (!patch.ok) {
        console.error(`PATCH failed: ${patch.status} ${await patch.text()}`)
        process.exit(1)
    }
    console.log('PATCH ok (204 No Content expected):', patch.status)

    const after = await getSettings(token)
    console.log(`Meeting ${meetingId} — after :`, after)

    if (after.join_before_host === true) {
        console.warn(
            '\n⚠  join_before_host is still TRUE after the patch — your Zoom account is\n' +
            '   forcing "Join before host" ON at the account level. Turn it off in\n' +
            '   Zoom admin → Settings → Meeting → Schedule Meeting → "Join before host".'
        )
    } else {
        console.log('\n✓ Students can no longer join before the host on this meeting.')
    }
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
