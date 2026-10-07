import { notFound } from 'next/navigation'
import UiPreviewContent from './ui-preview-content'

/**
 * /dashboard/ui-preview: development only.
 *
 * The UI revamp's component gallery (docs/ui-revamp-plan.md): every shared
 * component in both densities, with sample content. 404s in a production
 * build so it never exists on the live portal. It changes no data.
 */
export default function UiPreviewPage() {
    if (process.env.NODE_ENV === 'production') notFound()

    return <UiPreviewContent />
}
