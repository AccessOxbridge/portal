import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    const origin = new URL(request.url).origin
    if (request.headers.get('origin') !== origin)
        return new NextResponse(null, { status: 403 })
    const db = await createClient()
    await db.auth.signOut()
    return NextResponse.redirect(new URL('/login', request.url), 303)
}
