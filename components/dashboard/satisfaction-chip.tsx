'use client'

import { ChatTeardropText as MessageSquareHeart } from '@phosphor-icons/react/ssr'

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
            // Same 44px white chip as the hours pill and the bell beside it.
            className="group flex h-11 items-center gap-2 rounded-full border border-transparent bg-card ps-1.5 pe-1.5 text-foreground shadow-border outline-none
            transition-[box-shadow,scale] duration-150 ease-out hover:shadow-border-hover active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 2xl:pe-4"
        >
            <span className="relative grid size-8 place-items-center rounded-full bg-tint-rose text-tint-rose-foreground">
                <MessageSquareHeart weight="fill" className="size-4" />
                {/* It lost the full-width strip's prominence; the dot is what
                    still says "this wants something from you". */}
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
            </span>

            <span className="hidden 2xl:flex flex-col text-left leading-tight">
                <span className="text-sm font-medium text-foreground">Quick check-in</span>
                <span className="text-xs text-muted-foreground">30 seconds</span>
            </span>
        </button>
    )
}
