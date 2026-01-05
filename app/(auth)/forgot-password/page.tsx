import Link from 'next/link'
import { forgotPassword } from '../../auth/actions'
import { Suspense } from 'react'

function ForgotPasswordForm() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Reset your password</h1>
                <p className="text-sm text-gray-600 mb-6 text-center">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button
                        formAction={forgotPassword}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Send reset link
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

function SuccessMessage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Check your email</h1>
                <p className="text-sm text-gray-600 mb-6 text-center">
                    We've sent you a password reset link. Please check your email and follow the instructions.
                </p>
                <div className="text-center">
                    <Link
                        href="/login"
                        className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const params = await searchParams
    if (params.status === 'sent') {
        return <SuccessMessage />
    }

    return <ForgotPasswordForm />
}



