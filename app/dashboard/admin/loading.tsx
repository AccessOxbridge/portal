import { PageSkeleton } from '@/components/ui/page-skeleton'

// Shown the moment a link in this area is clicked, until the page's data is ready.
export default function Loading() {
    return <PageSkeleton cards={4} rows={6} compact />
}
