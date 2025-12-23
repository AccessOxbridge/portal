import { MENTOR_ONBOARDING_QUESTIONS } from '@/config/mentor-onboarding.config'
import { submitOnboarding } from './actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Check if already applied
    const { data: application } = await supabase
        .from('mentor_applications')
        .select('status')
        .eq('user_id', user.id)
        .single()

    if (application) {
        return redirect('/dashboard/mentor')
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white">
                    <h1 className="text-3xl font-bold">Mentor Onboarding</h1>
                    <p className="mt-2 text-indigo-100 italic">Help us understand your expertise and background.</p>
                </div>

                <form action={submitOnboarding} className="px-8 py-8 space-y-6">
                    {MENTOR_ONBOARDING_QUESTIONS.map((question) => (
                        <div key={question.id}>
                            <label htmlFor={question.id} className="block text-sm font-semibold text-gray-700 mb-2">
                                {question.label} {question.required && <span className="text-red-500">*</span>}
                            </label>

                            {question.type === 'text' && (
                                <input
                                    type="text"
                                    id={question.id}
                                    name={question.id}
                                    required={question.required}
                                    placeholder={question.placeholder}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                />
                            )}

                            {question.type === 'textarea' && (
                                <textarea
                                    id={question.id}
                                    name={question.id}
                                    required={question.required}
                                    placeholder={question.placeholder}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                                />
                            )}

                            {question.type === 'select' && (
                                <select
                                    id={question.id}
                                    name={question.id}
                                    required={question.required}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-white"
                                >
                                    <option value="">Select an option</option>
                                    {question.options?.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {question.type === 'multiselect' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {question.options?.map((option) => (
                                        <label key={option} className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-indigo-50 transition-colors cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                name={question.id}
                                                value={option}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="ml-3 text-sm text-gray-600 group-hover:text-indigo-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-indigo-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-indigo-200"
                    >
                        Submit Application
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        By submitting, you agree to our terms of service and mentor guidelines.
                    </p>
                </form>
            </div>
        </div>
    )
}
