'use client'

import { MessageSquareHeart } from 'lucide-react'

/**
 * The satisfaction check-in prompt, as a chip in the floating top-right
 * cluster beside the credits pill and the bell.
 *
 * It used to be a full-width strip rendered inline above every student page.
 * Inline meant it pushed the page down, and on full-height screens — Messages
 * above all — that pushed the composer below the fold. Floating with the rest
 * of the chrome it takes no layout space anywhere.
 *
 * Still "persists until filled": no dismiss control. The parent renders it only
 * while a survey is due, which is retired by a submitted row in
 * `student_satisfaction_surveys`.
 *
 * Shape, blur, border and shadow match CreditsFloatingButton so the three read
 * as one cluster. The label shows from 2xl up; below that it is the icon alone,
 * because at xl the labelled cluster reaches the end of the "Student Dashboard" heading.
 */
export default function SatisfactionChip({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Quick check-in: how are we doing? Three questions, about thirty seconds."
            className="group flex items-center gap-3 px-2 2xl:pl-2 2xl:pr-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/40
            shadow-2xl shadow-black/5 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
            <div className="relative flex items-center justify-center p-2 rounded-xl bg-rich-beige-accent text-accent">
                <MessageSquareHeart className="w-5 h-5" />
                {/* It lost the full-width strip's prominence; the dot is what
                    still says "this wants something from you". */}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </div>

            <div className="hidden 2xl:flex flex-col text-left">
                <span className="text-sm font-bold text-accent leading-tight">Quick check-in</span>
                <span className="text-[9px] font-semibold tracking-wide text-gray-400 uppercase">
                    30 seconds
                </span>
            </div>
        </button>
    )
}
