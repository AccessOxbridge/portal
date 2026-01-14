'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { signup } from '../../auth/actions'

interface PasswordValidation {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
}

export default function SignupPage() {
    const [password, setPassword] = useState('')
    const [isTouched, setIsTouched] = useState(false)
    const [email, setEmail] = useState('')
    const [isEmailTouched, setIsEmailTouched] = useState(false)

    const isEmailValid = useMemo(() => {
        if (!email) return false
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }, [email])

    const showEmailError = isEmailTouched && email.length > 0 && !isEmailValid

    const validation: PasswordValidation = useMemo(() => ({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    }), [password])

    const isPasswordValid = validation.minLength && validation.hasUppercase && validation.hasLowercase && validation.hasNumber

    const showValidation = isTouched && password.length > 0 && !isPasswordValid

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="full_name">
                            Full Name
                        </label>
                        <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setIsEmailTouched(true)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${showEmailError ? 'border-red-300' : 'border-gray-300'
                                }`}
                        />
                        {showEmailError && (
                            <p className="mt-2 text-sm text-red-600">
                                Please enter a valid email address
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setIsTouched(true)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${showValidation ? 'border-red-300' : 'border-gray-300'
                                }`}
                        />
                        {showValidation && (
                            <ul className="mt-2 text-sm space-y-1">
                                <li className={validation.minLength ? 'text-green-600' : 'text-red-600'}>
                                    {validation.minLength ? '✓' : '✗'} At least 8 characters
                                </li>
                                <li className={validation.hasUppercase ? 'text-green-600' : 'text-red-600'}>
                                    {validation.hasUppercase ? '✓' : '✗'} At least one uppercase letter
                                </li>
                                <li className={validation.hasLowercase ? 'text-green-600' : 'text-red-600'}>
                                    {validation.hasLowercase ? '✓' : '✗'} At least one lowercase letter
                                </li>
                                <li className={validation.hasNumber ? 'text-green-600' : 'text-red-600'}>
                                    {validation.hasNumber ? '✓' : '✗'} At least one number
                                </li>
                            </ul>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="role">
                            I am a...
                        </label>
                        <select
                            id="role"
                            name="role"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="student">Student / Parent</option>
                            <option value="mentor">Mentor</option>
                            {
                                process.env.NEXT_PUBLIC_ENV === 'dev' && (
                                    <>
                            <option value="admin">Admin</option>
                            <option value="admin-dev">Admin (Dev) - Access All</option>
                                    </>
                                )
                            }
                        </select>
                    </div>
                    <button
                        formAction={signup}
                        disabled={!isPasswordValid || !isEmailValid}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm 
                        text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isPasswordValid && isEmailValid
                                ? 'bg-accent hover:bg-accent/80'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Sign up
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}
