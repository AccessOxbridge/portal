import { PageSkeleton } from '@/components/ui/page-skeleton'

// Settings and anything else directly under /dashboard. The student, mentor
// and admin areas have their own loading.tsx.
export default function Loading() {
    return <PageSkeleton cards={2} rows={4} />
}
