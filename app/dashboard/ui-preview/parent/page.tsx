import { notFound } from 'next/navigation'
import ParentPreview from './parent-preview'

/**
 * /dashboard/ui-preview/parent: development only.
 *
 * Mockup of the parent view (V1, read-only) built with the real components
 * and sample data, so the layout can be agreed before any parent page or
 * table exists. 404s in a production build; reads and writes no data.
 */
export default function ParentPreviewPage() {
    if (process.env.NODE_ENV === 'production') notFound()

    return <ParentPreview />
}
