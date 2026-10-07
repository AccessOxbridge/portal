'use client'

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'

/**
 * WhatsApp-style unread handling shared by the participant thread
 * (ChatWindow) and the admin overview:
 *
 * - Opening a thread lands on an "N unread messages" divider above the first
 *   message you have not seen, instead of at the very bottom.
 * - The jump-to-latest arrow carries a count of messages below you — the
 *   unread ones you landed above, plus any that arrive while scrolled up.
 *
 * The divider is computed once, from the read state as it was *before* the
 * thread was marked read, and stays put until the thread is closed.
 */

/** Fired after a thread is marked read, so the nav badges refetch at once. */
export const CHAT_READ_EVENT = 'chat:read'

export function notifyChatRead() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHAT_READ_EVENT))
}

export interface UnreadMarker {
    /** First message the reader has not seen; the divider sits above it. */
    firstUnreadId: string | null
    count: number
}

export const NO_UNREAD: UnreadMarker = { firstUnreadId: null, count: 0 }

/**
 * Messages from other people that satisfy `isUnread`, in thread order. Own
 * messages never count, even when they sit after the first unread one.
 */
export function findUnread<M extends { id: string; sender_id: string }>(
    messages: M[],
    currentUserId: string,
    isUnread: (message: M) => boolean
): UnreadMarker {
    const unread = messages.filter((m) => m.sender_id !== currentUserId && isUnread(m))
    return unread.length === 0 ? NO_UNREAD : { firstUnreadId: unread[0].id, count: unread.length }
}

/**
 * Scroll behaviour for a thread pane. `threadKey` identifies the open thread
 * and `isReady` must only turn true once that thread's messages (and its
 * divider, if any) are rendered — initial positioning happens exactly once
 * per key, on the first ready commit.
 */
export function useThreadScroll({
    threadKey,
    isReady,
    messages,
    initialUnread,
}: {
    threadKey: string | null
    isReady: boolean
    messages: unknown[]
    initialUnread: number
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const dividerRef = useRef<HTMLDivElement>(null)

    // State drives rendering; the ref is what callbacks and effects read, since
    // a setState from inside a layout effect is not visible to the passive
    // effects of that same commit.
    const [isAtBottom, setIsAtBottom] = useState(true)
    const isAtBottomRef = useRef(true)
    const [unseen, setUnseen] = useState(0)
    const positionedFor = useRef<string | null>(null)
    const lastScrollTop = useRef(0)

    const setAtBottom = useCallback((atBottom: boolean) => {
        isAtBottomRef.current = atBottom
        setIsAtBottom(atBottom)
        if (atBottom) setUnseen(0)
    }, [])

    const distanceFromBottom = () => {
        const el = scrollRef.current
        return el ? el.scrollHeight - el.scrollTop - el.clientHeight : 0
    }

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        // Scroll the thread itself, never via scrollIntoView: that also scrolls
        // every scrollable ancestor, and the dashboard's <main> is one — when
        // the page is taller than the viewport it dragged the whole page along.
        const el = scrollRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    }, [])

    /**
     * Only scrolling *up* leaves the bottom. A smooth scroll down to the latest
     * message fires scroll events at every intermediate position; reading
     * those as "left the bottom" meant a message landing mid-animation was not
     * followed, and a just-sent message stayed below the fold.
     *
     * "Near" rather than exactly at the bottom: a fractional scroll height, an
     * image finishing its load, or a browser's own rounding all leave a couple
     * of pixels behind, and none of them mean the reader has scrolled away.
     */
    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const movedUp = el.scrollTop < lastScrollTop.current
        lastScrollTop.current = el.scrollTop
        if (distanceFromBottom() < 80) setAtBottom(true)
        else if (movedUp) setAtBottom(false)
    }, [setAtBottom])

    // Switching threads starts from a clean slate. Adjusted during render
    // rather than in an effect, per React's "resetting state on a key change";
    // the ref is re-derived by handleScroll when the new thread is positioned.
    const [trackedKey, setTrackedKey] = useState(threadKey)
    if (trackedKey !== threadKey) {
        setTrackedKey(threadKey)
        setIsAtBottom(true)
        setUnseen(0)
    }

    // Opening: land on the divider when there is one, otherwise at the end.
    // Layout effect so the first painted frame is already in position.
    useLayoutEffect(() => {
        if (!isReady || !threadKey || positionedFor.current === threadKey) return
        positionedFor.current = threadKey

        const el = scrollRef.current
        const divider = dividerRef.current
        if (el && divider) {
            const offset = divider.getBoundingClientRect().top - el.getBoundingClientRect().top
            // A little air above the divider, so it does not sit flush on the header.
            el.scrollTop += offset - 12
        } else {
            scrollToBottom('instant')
        }

        // Set explicitly: landing on the divider is a jump *down* from the
        // top, which handleScroll would not count as leaving the bottom.
        lastScrollTop.current = el?.scrollTop ?? 0
        // This state comes from measuring the DOM, which is exactly what a
        // layout effect is for — it cannot be derived during render.
        const atBottom = distanceFromBottom() < 80
        setAtBottom(atBottom)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!atBottom) setUnseen(initialUnread)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, threadKey])

    // Follow the conversation only while the reader is already at its end.
    // Yanking the view down mid-sentence is the worst thing a chat pane can do.
    useEffect(() => {
        if (positionedFor.current !== threadKey) return
        if (isAtBottomRef.current) scrollToBottom()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages])

    /** A message from someone else arrived. Counts toward the arrow badge. */
    const noteArrival = useCallback(() => {
        if (!isAtBottomRef.current) setUnseen((n) => n + 1)
    }, [])

    /** Sending, or tapping the arrow, is an explicit move to the end. */
    const jumpToLatest = useCallback(() => {
        setAtBottom(true)
        scrollToBottom()
    }, [setAtBottom, scrollToBottom])

    return {
        scrollRef,
        endRef,
        dividerRef,
        isAtBottom,
        unseen,
        handleScroll,
        noteArrival,
        jumpToLatest,
    }
}

export const UnreadDivider = forwardRef<HTMLDivElement, { count: number }>(function UnreadDivider(
    { count },
    ref
) {
    const label = `${count} unread message${count === 1 ? '' : 's'}`
    return (
        <div ref={ref} className="flex items-center gap-3 py-3" role="separator" aria-label={label}>
            <span className="flex-1 h-px bg-accent/20" />
            <span className="px-3 py-1 rounded-full bg-accent/10 text-[11px] font-semibold text-accent tracking-wide">
                {label}
            </span>
            <span className="flex-1 h-px bg-accent/20" />
        </div>
    )
})

export function JumpToLatestButton({ unseen, onClick }: { unseen: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={unseen > 0 ? `Jump to latest, ${unseen} unread` : 'Jump to latest message'}
            className="absolute bottom-4 right-4 md:right-6 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-accent hover:border-accent/30 transition-colors"
        >
            <ArrowDown className="w-4 h-4" />
            {unseen > 0 && (
                <span className="absolute -top-2 -right-1 min-w-[20px] h-[20px] px-1 bg-accent rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white tabular-nums">
                    {unseen > 99 ? '99+' : unseen}
                </span>
            )}
        </button>
    )
}
