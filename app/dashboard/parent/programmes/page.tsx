import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/server'
import { requireParent } from '@/lib/parent-dashboard'
import { PROGRAMMES, PROGRAMMES_DRAFT } from '@/lib/parent-programmes'
import { wordsFor } from '@/lib/parent-words'
import { Badge } from '@/components/ui/badge'
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
                    {PROGRAMMES_DRAFT && (
                        <Badge tone="amber" className="mb-4">
                            Draft · details to be confirmed
                        </Badge>
                    )}
                    <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                        Support for every step to Oxford and Cambridge
                    </h1>
                    <p className="mt-3 text-pretty text-muted-foreground sm:text-lg">
                        Choose how much help {w.child} gets, from a first look at the process to a full programme with
                        an Oxbridge mentor.
                    </p>
                </header>
            </Rise>

            <Rise i={2} className="mt-10">
                <ProgrammeTiers programmes={PROGRAMMES} words={w} />
            </Rise>

            <Rise i={3}>
                <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-pretty text-muted-foreground">
                    Sessions depend on mentor availability. Access Oxbridge is independent of the University of Oxford
                    and the University of Cambridge.
                </p>
            </Rise>
        </div>
    )
}
