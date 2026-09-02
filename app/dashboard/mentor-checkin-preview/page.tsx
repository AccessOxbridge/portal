import { notFound } from 'next/navigation'
import MentorCheckinPreviewContent from './mentor-checkin-preview-content'

/**
 * /dashboard/mentor-checkin-preview — development only.
 *
 * 404s in a production build so the route never exists on the live portal.
 * Any signed-in role can open it locally; it is a rendering harness, not a
 * mentor surface, and it touches no session data.
 */
export default function MentorCheckinPreviewPage() {
    if (process.env.NODE_ENV === 'production') notFound()

    return <MentorCheckinPreviewContent />
}
