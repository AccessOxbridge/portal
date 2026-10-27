import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/server'
import { requireParent } from '@/lib/parent-dashboard'
import { PROGRAMMES } from '@/lib/parent-programmes'
import { wordsFor } from '@/lib/parent-words'
import { Rise } from '@/components/parent/parent-home'
import { ProgrammeTiers } from '@/components/parent/programme-tiers'

/**
 * The three Access Oxbridge programmes, opened from "See Oxbridge Programmes"
 * in the top-right corner of every parent page. UI only: nothing is charged.
 */
export default async function ParentProgrammesPage() {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const w = wordsFor(ctx.childFirstName)

    return (
        <div className="mx-auto max-w-6xl pb-16">
            <Rise i={0}>
                <Link
                    href="/dashboard/parent"
                    className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                    <ArrowLeft className="size-4" />
                    Progress Tracker
                </Link>
            </Rise>

            <Rise i={1}>
                <header className="mx-auto mt-6 max-w-2xl text-center sm:mt-10">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold-foreground">Choose your membership · Years 7–11</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                        Membership options
                    </h1>
                    <p className="mt-3 text-pretty text-muted-foreground sm:text-lg">
                        Expert guidance for {w.child}, with the level of support that suits your family.
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground">Monthly membership · Cancellable at any time</p>
                </header>
            </Rise>

            <Rise i={2} className="mt-12">
                <ProgrammeTiers programmes={PROGRAMMES} />
            </Rise>

            <Rise i={3}>
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ['One-to-one', 'Every session is individual to your child.'],
                        ['Flexible', 'Memberships may be changed as needs develop.'],
                        ['No fixed term', 'Monthly membership continues until cancelled. Service continues until the end of your paid billing period.'],
                        ['Secure payments', 'Payments will be processed by Stripe when online enrolment opens.'],
                    ].map(([title, text]) => (
                        <div key={title} className="border-t border-gold/60 pt-4">
                            <h3 className="font-semibold">{title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                        </div>
                    ))}
                </div>
                <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-pretty text-muted-foreground">
                    Sessions depend on mentor availability. Access Oxbridge is independent of the University of Oxford
                    and the University of Cambridge.
                </p>
            </Rise>
        </div>
    )
}
