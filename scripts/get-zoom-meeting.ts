/**
 * One-off: print key settings + host info for a Zoom meeting.
 *   bun run scripts/get-zoom-meeting.ts <meetingId>
 */
import { getZoomAccessToken } from '../utils/zoom'

const meetingId = process.argv[2] || '81429959692'

async function main() {
    const token = await getZoomAccessToken()
    const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`GET failed: ${res.status} ${await res.text()}`)
    const d = await res.json()
    console.log(JSON.stringify({
        id: d.id,
        host_id: d.host_id,
        host_email: d.host_email,
        join_before_host: d.settings?.join_before_host,
        waiting_room: d.settings?.waiting_room,
        jbh_time: d.settings?.jbh_time,
        approval_type: d.settings?.approval_type,
    }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
