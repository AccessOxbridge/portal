import Link from 'next/link'
import { resetPassword } from '../../auth/actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

function ErrorMessage({ error, errorCode, errorDescription }: {
    error?: string,
    errorCode?: string,
    errorDescription?: string
}) {
    return (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                        {errorCode === 'otp_expired' ? 'Link expired' : 'Error'}
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                        <p>
                            {errorDescription || error || 'This password reset link is invalid or has expired. Please request a new one.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default async function ResetPasswordPage({ searchParams }: {
    searchParams: Promise<{ error?: string, error_code?: string, error_description?: string }>
}) {
    const params = await searchParams
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    // If there's an error from Supabase (e.g., link expired)
    if (params.error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
                <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-6 text-center">Reset link error</h1>
                    <ErrorMessage
                        error={params.error}
                        errorCode={params.error_code}
                        errorDescription={params.error_description}
                    />
                    <div className="text-center mt-6">
                        <Link
                            href="/forgot-password"
                            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Request new reset link
                        </Link>
                    </div>
                    <p className="mt-4 text-center text-sm text-gray-600">
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Back to login
                        </Link>
                    </p>
                </div>
            </div>
        )
    }

    // If no session and no error, this is likely an unauthorized access attempt
    if (!session) {
        redirect('/login')
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Set new password</h1>
                <p className="text-sm text-gray-600 mb-6 text-center">
                    Enter your new password below.
                </p>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                            New Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={6}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button
                        formAction={resetPassword}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Update password
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Remember your password?{' '}
                    <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Back to login
                    </Link>
                </p>
            </div>
        </div>
    )
}
