import { createClient } from '@/utils/supabase/server'
import { loadParentReports, requireParent, timezoneLabel } from '@/lib/parent-dashboard'
import { ParentFootnote, ParentHeading, ParentReportCard, ReportsEmpty, Rise } from '@/components/parent/parent-home'

/** Every session report for the linked child, newest first. Not the mentor's private notes. */
export default async function ParentReportsPage() {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const reports = await loadParentReports(supabase, ctx)

    return (
        <div className="mx-auto max-w-3xl pb-16">
            <ParentHeading childFirstName={ctx.childFirstName} title="Session reports" />
            <Rise i={1} className="mt-8 space-y-4">
                {reports.length ? reports.map((r) => <ParentReportCard key={r.id} report={r} />) : <ReportsEmpty childFirstName={ctx.childFirstName} />}
            </Rise>
            <ParentFootnote childFirstName={ctx.childFirstName} timezoneLabel={timezoneLabel(ctx.timezone)} />
        </div>
    )
}
