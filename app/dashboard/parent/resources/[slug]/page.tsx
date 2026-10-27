import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { requireParent } from '@/lib/parent-dashboard'
import { getGuide } from '@/lib/parent-resources'
import { ParentGuideArticle } from '@/components/parent/parent-guide'

/**
 * One guide, read inside the portal. Parents only. The guides written for
 * students open once the family is enrolled (the parent is linked to their
 * child's account); before that, the Resources page shows them locked and a
 * direct link goes back there.
 */
export default async function ParentGuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const { slug } = await params
    const found = getGuide(slug)
    if (!found) notFound()
    if (found.forChild && !ctx.childId) redirect('/dashboard/parent/resources')
    return <ParentGuideArticle guide={found.guide} />
}
