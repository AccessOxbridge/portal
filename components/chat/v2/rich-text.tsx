'use client'

/**
 * Renders message text with clickable links.
 *
 * Why not react-markdown: mentors and students write prose, not markup. Full
 * markdown would silently eat asterisks around a word, turn "1." into a list
 * and mangle underscores in filenames. We autolink and nothing else.
 *
 * The visual fix this exists for: a raw URL in a plain <p> with `break-words`
 * gets chopped mid-character into a ragged block. Here the href stays intact
 * while the *displayed* text is truncated in the middle, so a long calendar
 * link reads as `calendar.google.com/…/eventedit` on one line.
 */

const URL_PATTERN =
    /((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?'"]|[\w.+-]+@[\w-]+\.[\w.-]+)/gi

/** Longest link text we show before shortening the middle. */
const MAX_LINK_TEXT = 44

function toHref(raw: string): string {
    if (raw.includes('@') && !raw.includes('/')) return `mailto:${raw}`
    if (raw.startsWith('www.')) return `https://${raw}`
    return raw
}

/**
 * Shorten a URL for display while keeping both ends readable — the host tells
 * you where it goes, the tail tells you what it is.
 */
function displayText(raw: string): string {
    if (raw.length <= MAX_LINK_TEXT) return raw

    const stripped = raw.replace(/^https?:\/\//, '')
    if (stripped.length <= MAX_LINK_TEXT) return stripped

    const slash = stripped.indexOf('/')
    const host = slash === -1 ? stripped : stripped.slice(0, slash)
    const rest = slash === -1 ? '' : stripped.slice(slash)

    if (!rest || host.length >= MAX_LINK_TEXT - 6) {
        return `${stripped.slice(0, MAX_LINK_TEXT - 1)}…`
    }

    const tailRoom = MAX_LINK_TEXT - host.length - 2
    const tail = rest.length > tailRoom ? `…${rest.slice(-tailRoom)}` : rest
    return `${host}${tail}`
}

interface RichTextProps {
    content: string
    /** Sent bubbles are navy, so links need a light treatment there. */
    onDark?: boolean
}

export default function RichText({ content, onDark = false }: RichTextProps) {
    const parts = content.split(URL_PATTERN)

    return (
        // `overflow-wrap: anywhere` instead of `break-words`: it only breaks a
        // word when the line genuinely cannot fit, rather than eagerly.
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
            {parts.map((part, i) => {
                // split() with a capturing group puts matches at odd indices.
                if (i % 2 === 0) return part

                return (
                    <a
                        key={i}
                        href={toHref(part)}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={part}
                        className={
                            onDark
                                ? 'underline underline-offset-2 decoration-white/40 hover:decoration-white font-medium transition-colors'
                                : 'text-accent underline underline-offset-2 decoration-accent/30 hover:decoration-accent font-medium transition-colors'
                        }
                    >
                        {displayText(part)}
                    </a>
                )
            })}
        </p>
    )
}
