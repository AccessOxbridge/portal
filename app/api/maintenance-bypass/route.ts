import { NextResponse, type NextRequest } from 'next/server'
import { MAINTENANCE_BYPASS_COOKIE, bypassToken } from '@/proxy'

// GET /api/maintenance-bypass?secret=<MAINTENANCE_BYPASS_SECRET>
//   -> sets a signed bypass cookie and redirects to "/", letting the holder
//      browse the app normally while MAINTENANCE_MODE is on.
// GET /api/maintenance-bypass?clear=1
//   -> clears the bypass cookie.
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl

    if (searchParams.get('clear')) {
        const res = NextResponse.redirect(new URL('/maintenance', request.url))
        res.cookies.delete(MAINTENANCE_BYPASS_COOKIE)
        return res
    }

    const configured = process.env.MAINTENANCE_BYPASS_SECRET
    const provided = searchParams.get('secret')

    if (!configured) {
        return new NextResponse('Maintenance bypass is not configured.', { status: 404 })
    }
    if (!provided || provided !== configured) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const res = NextResponse.redirect(new URL('/', request.url))
    res.cookies.set(MAINTENANCE_BYPASS_COOKIE, await bypassToken(configured), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 12, // 12 hours — long enough for a maintenance window.
    })
    return res
}
