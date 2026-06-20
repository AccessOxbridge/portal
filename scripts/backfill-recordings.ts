/**
 * One-off backfill: for existing sessions that have a Zoom meeting but no
 * recording captured yet, ask Zoom for the cloud recording and, if an MP4
 * exists, store its URLs and flip recording_available = true so the
 * "Watch Recording" button shows in the student portal.
 *
 *   bun run scripts/backfill-recordings.ts          # apply
 *   bun run scripts/backfill-recordings.ts --dry-run # report only, no writes
 *
 * Note: the download_url returned by the Recordings API needs our Zoom OAuth
 * token to fetch, which /api/recording/[sessionId] already handles via the
 * meeting id, so we don't need to store a per-row download token here.
 */
import { createClient } from '@supabase/supabase-js'
import { getZoomRecordings } from '../utils/zoom'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const dryRun = process.argv.includes('--dry-run')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
    // Sessions that have a Zoom meeting but no recording captured yet.
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, zoom_meeting_id, scheduled_at, recording_available')
        .not('zoom_meeting_id', 'is', null)
        .or('recording_available.is.null,recording_available.eq.false')
        .order('scheduled_at', { ascending: false })

    if (error) {
        console.error('Failed to query sessions:', error)
        process.exit(1)
    }

    const candidates = sessions || []
    console.log(`Found ${candidates.length} session(s) without a captured recording.${dryRun ? ' (dry run)' : ''}`)

    let updated = 0
    let noRecording = 0
    let failed = 0

    for (const session of candidates) {
        const meetingId = session.zoom_meeting_id as string
        try {
            const recordings = await getZoomRecordings(meetingId)
            const videoFile =
                recordings?.recording_files?.find(
                    (f) => f.file_type === 'MP4' && f.recording_type === 'shared_screen_with_speaker_view'
                ) || recordings?.recording_files?.find((f) => f.file_type === 'MP4')

            if (!videoFile?.download_url) {
                noRecording++
                continue
            }

            console.log(`✓ Recording found for session ${session.id} (meeting ${meetingId})`)

            if (!dryRun) {
                const { error: updateError } = await supabase
                    .from('sessions')
                    .update({
                        recording_play_url: (videoFile as any).play_url || null,
                        recording_download_url: videoFile.download_url,
                        recording_available: true,
                    })
                    .eq('id', session.id)

                if (updateError) {
                    console.error(`  ✗ Failed to update session ${session.id}:`, updateError.message)
                    failed++
                    continue
                }
            }
            updated++
        } catch (err) {
            console.error(`  ✗ Error checking meeting ${meetingId}:`, err instanceof Error ? err.message : err)
            failed++
        }

        // Be gentle with Zoom's rate limits.
        await sleep(350)
    }

    console.log('\nBackfill complete:')
    console.log(`  ${updated} session(s) ${dryRun ? 'would be marked' : 'marked'} as having a recording`)
    console.log(`  ${noRecording} session(s) had no cloud recording`)
    console.log(`  ${failed} error(s)`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
