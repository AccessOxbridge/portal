/**
 * Diagnostic: create a meeting through our real createZoomMeeting() code path
 * (which sends join_before_host:false) and read it straight back. If the
 * read-back shows join_before_host:true, the Zoom *account* is overriding the
 * per-meeting flag (not a code bug).
 *
 *   bun run scripts/test-zoom-jbh.ts
 */
import { createZoomMeeting, getZoomAccessToken } from '../utils/zoom'

async function main() {
    const meeting = await createZoomMeeting({
        topic: 'JBH diagnostic — safe to delete',
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        duration: 30,
    })
    console.log('Created meeting:', meeting.id)

    const token = await getZoomAccessToken()
    const res = await fetch(`https://api.zoom.us/v2/meetings/${meeting.id}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json()
    console.log('Read-back join_before_host:', d.settings?.join_before_host)
    console.log('Read-back waiting_room   :', d.settings?.waiting_room)

    if (d.settings?.join_before_host === true) {
        console.warn('\n⚠  Code sent false but Zoom stored true → ACCOUNT-LEVEL override is on.')
    } else {
        console.log('\n✓ Per-meeting setting honoured — code path is correct.')
    }
}

main().catch((e) => { console.error(e); process.exit(1) })
