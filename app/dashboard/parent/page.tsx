import { createClient } from '@/utils/supabase/server'
import { loadParentHome, requireParent } from '@/lib/parent-dashboard'
import { ParentHome } from '@/components/parent/parent-home'

/**
 * Parent home: the eight widgets from "Confirmed Dashboard Widgets", for the
 * one linked child, read-only. Reads go through the parent's own client, so
 * the database only returns that child's rows.
 */
export default async function ParentHomePage() {
    const supabase = await createClient()
    const ctx = await requireParent(supabase)
    const data = await loadParentHome(supabase, ctx)
    return <ParentHome data={data} />
}
