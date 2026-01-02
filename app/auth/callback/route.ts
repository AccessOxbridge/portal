import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/dashboard'
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
        console.error('Auth callback error:', error, errorDescription)
        if (next.includes('reset-password')) {
            return NextResponse.redirect(`${origin}/reset-password?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`)
        }
        return NextResponse.redirect(`${origin}/error?message=${encodeURIComponent(errorDescription || error)}`)
    }

    if (code) {
        // Handle email verification
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that origin is the right one
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    } else if (accessToken && refreshToken && type === 'recovery') {
        // Handle password reset recovery
        const supabase = await createClient()
        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        })
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that origin is the right one
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/error?message=Email verification failed or link expired.`)
}
