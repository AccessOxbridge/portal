'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/lib'
import RichText from './rich-text'

/**
 * A message body that collapses when it is long enough to swamp the thread.
 *
 * Mentors write essay feedback, and one of those can fill the whole pane and
 * bury everything said after it. Collapsed, a long message keeps its place in
 * the conversation without taking the whole screen.
 *
 * The "is it long" test is a plain count rather than a measured height, so it
 * is decided during render: measuring would mean writing state from an effect,
 * which costs a second paint on every message in the thread and shows the full
 * message for a frame before snapping shut.
 */

/** Roughly a dozen lines of prose, past which a message dominates the pane. */
const LONG_CHARS = 900
const LONG_LINES = 18

export function isLongMessage(content: string): boolean {
    return content.length > LONG_CHARS || content.split('\n').length > LONG_LINES
}

interface CollapsibleTextProps {
    content: string
    /** Sent bubbles are navy, so the fade and the toggle need a light treatment. */
    onDark?: boolean
    /**
     * Tailwind `from-*` colour for the fade — it has to match whatever sits
     * behind the text, or the gradient shows as a grey smear.
     */
    fadeFrom?: string
}

export default function CollapsibleText({
    content,
    onDark = false,
    fadeFrom = 'from-[#FAFBFC]',
}: CollapsibleTextProps) {
    const [expanded, setExpanded] = useState(false)

    if (!isLongMessage(content)) {
        return <RichText content={content} onDark={onDark} />
    }

    return (
        <div>
            <div className={cn('relative overflow-hidden', !expanded && 'max-h-80')}>
                <RichText content={content} onDark={onDark} />

                {!expanded && (
                    <div
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t to-transparent',
                            fadeFrom
                        )}
                    />
                )}
            </div>

            <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className={cn(
                    'mt-1 inline-flex items-center gap-1 text-[13px] font-semibold transition-colors',
                    onDark ? 'text-white/80 hover:text-white' : 'text-accent hover:text-accent/80'
                )}
            >
                {expanded ? (
                    <>
                        Show less
                        <ChevronUp className="w-3.5 h-3.5" />
                    </>
                ) : (
                    <>
                        Read more
                        <ChevronDown className="w-3.5 h-3.5" />
                    </>
                )}
            </button>
        </div>
    )
}
