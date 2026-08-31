import { notFound } from 'next/navigation'
import MilestonePreviewContent from './milestone-preview-content'

/**
 * /dashboard/milestone-preview — development only.
 *
 * 404s in a production build so the route never exists on the live portal.
 * Any signed-in role can open it locally; it is a rendering harness, not a
 * student surface, and it touches no student data.
 */
export default function MilestonePreviewPage() {
    if (process.env.NODE_ENV === 'production') notFound()

    return <MilestonePreviewContent />
}
