import { createClient } from '@/utils/supabase/server'
import { requireParent } from '@/lib/parent-dashboard'
import { LOCKED_RESOURCES, PARENT_GUIDES, readingMinutes } from '@/lib/parent-resources'
import { wordsFor } from '@/lib/parent-words'
import { ParentHeading, Rise } from '@/components/parent/parent-home'
import { GuideCard, LockedCard } from '@/components/parent/resource-cards'

/**
 * Resources for parents: the guides written for parents, open to every
 * parent account (linked or not), and the guides for the child, shown locked
 * until the family's programme includes them.
 */
export default async function ParentResourcesPage() {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const w = wordsFor(ctx.childFirstName)

    return (
        <div className="mx-auto max-w-7xl pb-16">
            <ParentHeading title="Resources" />
            <Rise i={1}>
                <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
                    Guides to help you follow {w.childs} journey to Oxford or Cambridge, in plain English.
                </p>
            </Rise>

            <Rise i={2}>
                <section className="mt-8">
                    <h2 className="mb-3 text-lg font-semibold">Parent Resources</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {PARENT_GUIDES.map((g) => (
                            <GuideCard
                                key={g.slug}
                                href={`/dashboard/parent/resources/${g.slug}`}
                                eyebrow={g.eyebrow}
                                title={g.title}
                                summary={g.summary}
                                minutes={readingMinutes(g)}
                            />
                        ))}
                    </div>
                </section>
            </Rise>

            <Rise i={3}>
                <section className="mt-10">
                    <h2 className="mb-3 text-lg font-semibold">{w.Childs} Resources</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {LOCKED_RESOURCES.map((r) => (
                            <LockedCard key={r.title} title={r.title} summary={r.summary} childFirstName={ctx.childFirstName} />
                        ))}
                    </div>
                </section>
            </Rise>
        </div>
    )
}
