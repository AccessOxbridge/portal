import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { requireParent } from '@/lib/parent-dashboard'
import { getParentGuide } from '@/lib/parent-resources'
import { ParentGuideArticle } from '@/components/parent/parent-guide'

/** One parent guide, read inside the portal. Parents only. */
export default async function ParentGuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const supabase = await createClient()
    await requireParent(supabase)
    const { slug } = await params
    const guide = getParentGuide(slug)
    if (!guide) notFound()
    return <ParentGuideArticle guide={guide} />
}
