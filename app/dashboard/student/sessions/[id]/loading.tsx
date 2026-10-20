import { PageSkeleton } from '@/components/ui/page-skeleton'

// A single session's page: keep the generic shape, not the sessions list.
export default function Loading() {
    return <PageSkeleton cards={1} rows={3} />
}
