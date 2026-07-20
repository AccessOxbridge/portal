import { NextResponse, type NextRequest } from 'next/server'
import { updateSession, getUserRole } from '@/utils/supabase/middleware'

// Cookie set by /api/maintenance-bypass that lets a holder through the gate.
export const MAINTENANCE_BYPASS_COOKIE = 'ao_maintenance_bypass'

const ADMIN_ROLES = ['admin', 'admin-dev']

function maintenanceEnabled(): boolean {
    const v = (process.env.MAINTENANCE_MODE ?? '').trim().toLowerCase()
    return v === 'true' || v === 'on' || v === '1'
}

// Page paths that must stay reachable while maintenance is on. (API routes,
// _next static assets and image files are already excluded by `config.matcher`
// below, so webhooks/cron/static never hit this gate.)
function isAllowlisted(pathname: string): boolean {
    return pathname === '/maintenance' || pathname.startsWith('/maintenance/')
}

// SHA-256 hex of the bypass secret. The cookie stores this digest (not the raw
// secret), so it can be validated at the edge without persisting the secret.
export async function bypassToken(secret: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

export async function proxy(request: NextRequest) {
    // Normal operation: behave exactly as before (refresh the auth token).
    if (!maintenanceEnabled()) {
        return await updateSession(request)
    }

    const { pathname } = request.nextUrl

    // The maintenance page itself must render.
    if (isAllowlisted(pathname)) {
        return await updateSession(request)
    }

    // Signed bypass cookie (set via /api/maintenance-bypass?secret=...).
    const secret = process.env.MAINTENANCE_BYPASS_SECRET
    if (secret) {
        const cookie = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value
        if (cookie && cookie === (await bypassToken(secret))) {
            return await updateSession(request)
        }
    }

    // Already-signed-in admins/devs pass through.
    const role = await getUserRole(request)
    if (role && ADMIN_ROLES.includes(role)) {
        return await updateSession(request)
    }

    // Everyone else sees the maintenance screen.
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    url.search = ''
    return NextResponse.redirect(url)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes, including webhooks + cron — kept reachable during maintenance)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
