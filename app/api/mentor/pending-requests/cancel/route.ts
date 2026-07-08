import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const { requestId } = body

        if (!requestId || typeof requestId !== 'string') {
            return NextResponse.json({ error: 'Missing requestId.' }, { status: 400 })
        }

        const { error, data } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)
            .eq('mentor_id', user.id)
            .eq('initiated_by', 'mentor')
            .eq('status', 'pending')
            .select('id')

        if (error) throw error

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Request not found or already resolved.' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Cancel mentor pending request error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
