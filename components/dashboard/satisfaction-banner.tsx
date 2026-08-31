'use client'

import { MessageSquareHeart, ArrowRight } from 'lucide-react'
import { useStudentCreditsOptional } from '@/components/dashboard/student-credits-provider'

/**
 * The pinned prompt at the top of every student dashboard page.
 *
 * This is the part that "persists until filled": there is deliberately no
 * dismiss control. The banner is retired only by a submitted survey, which is
 * a row in `student_satisfaction_surveys` — so it also survives a reload, a
 * different device and a private window.
 *
 * Rendered through DashboardShell's `topSlot` rather than from the provider
 * alongside the other popups, because it is inline page content and has to
 * push the heading down rather than float over it. It still reads its state
 * from StudentCreditsProvider, which sits above the shell.
 *
 * On the styling: this is a *tint* of the brand navy, not the navy itself. A
 * fully saturated accent slab here reads heavier than the page's own H1 and
 * puts a second large navy block directly beside the navy sidebar, which is
 * what made the first attempt look wrong. Reown and Understory both solve the
 * same problem the same way — a low-contrast tonal strip with one compact
 * action — and that is what this copies.
 */
export default function SatisfactionBanner() {
    const student = useStudentCreditsOptional()

    // No provider means this is not a student dashboard; nothing due means
    // nothing to ask. Either way the banner takes up no space.
    if (!student?.satisfactionSurveyDue) return null

    return (
        <div
            // The 280px reserved on the right from md up keeps the strip clear
            // of the floating chrome: the credits pill and notification bell are
            // `fixed top-5` in the root layout and span the rightmost ~306px of
            // the viewport. 280px is the same figure the student dashboard
            // heading already reserves. Mobile needs none — MobileTopBar has
            // already pushed this content below the chrome.
            className="w-full md:w-[calc(100%-280px)] mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 rounded-2xl bg-rich-beige-accent border border-accent/10"
        >
            <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
                <MessageSquareHeart className="w-[18px] h-[18px] text-accent" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-accent font-bold text-[15px] leading-snug">
                    Quick check-in — how are we doing?
                </p>
                <p className="text-accent/60 text-[13px] leading-snug mt-0.5">
                    Three questions, about thirty seconds.
                </p>
            </div>

            <button
                type="button"
                onClick={student.openSatisfactionSurvey}
                className="group shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
                Start
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
    )
}
