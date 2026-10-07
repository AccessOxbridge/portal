import { notFound } from 'next/navigation'
import UiPreviewContent from './ui-preview-content'

/**
 * /dashboard/ui-preview: development only.
 *
 * The UI revamp's phase 0 comparison page (docs/ui-revamp-plan.md): sidebar
 * blue candidates on the real portal, Lucide vs Phosphor icons, and the new
 * design tokens. 404s in a production build so it never exists on the live
 * portal. It only renders pages and static samples; it changes no data.
 */
export default function UiPreviewPage() {
    if (process.env.NODE_ENV === 'production') notFound()

    return <UiPreviewContent />
}
