import { createClient } from '@/utils/supabase/server'
import { requireParent } from '@/lib/parent-dashboard'
import { PARENT_GUIDES, readingMinutes } from '@/lib/parent-resources'
import { CHILD_GUIDES } from '@/lib/child-guides'
import { wordsFor } from '@/lib/parent-words'
import { ParentHeading, Rise } from '@/components/parent/parent-home'
import { GuideCard, LockedCard } from '@/components/parent/resource-cards'

/**
 * Resources for parents: the guides written for parents, open to every
 * parent account (linked or not), and the guides written for the child,
 * shown locked until the family is enrolled (the parent is linked to the
 * child's account).
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
                        {CHILD_GUIDES.map((g) =>
                            ctx.childId ? (
                                <GuideCard
                                    key={g.slug}
                                    href={`/dashboard/parent/resources/${g.slug}`}
                                    eyebrow={g.eyebrow}
                                    title={g.title}
                                    summary={g.summary}
                                    minutes={readingMinutes(g)}
                                />
                            ) : (
                                <LockedCard key={g.slug} title={g.title} summary={g.summary} childFirstName={ctx.childFirstName} />
                            )
                        )}
                    </div>
                </section>
            </Rise>
        </div>
    )
}
