import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/0e9b57db-5534-496a-aad7-d2fdd61b30e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c623e4'},body:JSON.stringify({sessionId:'c623e4',runId:'pre-fix',hypothesisId:'H2',location:'proxy.ts:5',message:'proxy invoked',data:{pathname:request.nextUrl.pathname,method:request.method,hasStripeSig:!!request.headers.get('stripe-signature')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
