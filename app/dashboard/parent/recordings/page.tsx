import { createClient } from '@/utils/supabase/server'
import { getMentorPhotoUrl } from '@/lib/mentor-photo'
import { requireParent, timezoneLabel } from '@/lib/parent-dashboard'
import { ParentFootnote, ParentHeading, Rise } from '@/components/parent/parent-home'
import { wordsFor } from '@/lib/parent-words'
import StudentRecordingsContent from '@/app/dashboard/student/recordings/recordings-content'

/**
 * Session recordings for the linked child, played through /api/recording,
 * which allows a parent only for their linked child's sessions.
 */
export default async function ParentRecordingsPage() {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const w = wordsFor(ctx.childFirstName)

    const { data: sessions } = ctx.childId
        ? await supabase
              .from('sessions')
              .select('id, scheduled_at, duration_minutes, mentor:profiles!sessions_mentor_id_fkey (full_name, photo_url:mentors(photo_url))')
              .eq('student_id', ctx.childId)
              .eq('recording_available', true)
              .order('scheduled_at', { ascending: false, nullsFirst: false })
        : { data: [] }

    type Row = { id: string; scheduled_at: string | null; duration_minutes: number | null; mentor: { full_name: string | null } | null }
    const recordings = ((sessions || []) as unknown as Row[]).map((s) => ({
        id: s.id,
        scheduled_at: s.scheduled_at,
        duration_minutes: s.duration_minutes ?? 60,
        mentor_full_name: s.mentor?.full_name || 'Mentor',
        mentor_photo_url: getMentorPhotoUrl(s.mentor),
    }))

    return (
        <div className="mx-auto max-w-4xl pb-16">
            <ParentHeading childFirstName={ctx.childFirstName} title="Session recordings" />
            <Rise i={1} className="mt-8">
                <StudentRecordingsContent
                    recordings={recordings}
                    timezone={ctx.timezone}
                    emptyDescription={`Recordings of ${w.childs} sessions appear here a few minutes after each session ends.`}
                />
            </Rise>
            <ParentFootnote childFirstName={ctx.childFirstName} timezoneLabel={timezoneLabel(ctx.timezone)} />
        </div>
    )
}
