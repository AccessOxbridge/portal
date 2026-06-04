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

    // Resolve the correct base URL (handles load balancer / forwarded host).
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const baseUrl = isLocalEnv || !forwardedHost ? origin : `https://${forwardedHost}`

    const isResetFlow = next.includes('reset-password')

    // Helper: route exchange failures to the most helpful place.
    const failureRedirect = (message: string) => {
        if (isResetFlow) {
            return NextResponse.redirect(
                `${baseUrl}/reset-password?error=exchange_failed&error_description=${encodeURIComponent(message)}`
            )
        }
        return NextResponse.redirect(`${baseUrl}/error?message=${encodeURIComponent(message)}`)
    }

    if (code) {
        // Handle PKCE code exchange (email verification & password recovery)
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${baseUrl}${next}`)
        }
        console.error('Auth callback: exchangeCodeForSession failed:', error.message)
        return failureRedirect('This link is invalid or has expired. Please request a new one.')
    } else if (accessToken && refreshToken && type === 'recovery') {
        // Handle password reset recovery via explicit tokens
        const supabase = await createClient()
        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        })
        if (!error) {
            return NextResponse.redirect(`${baseUrl}${next}`)
        }
        console.error('Auth callback: setSession failed:', error.message)
        return failureRedirect('This link is invalid or has expired. Please request a new one.')
    }

    // No code/tokens present at all.
    return failureRedirect('Email verification failed or the link has expired.')
}
