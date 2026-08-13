'use client'

import { Fragment, type ReactNode } from 'react'
import { cn } from '@/utils/lib'
import { parseMessage, type Block, type InlineNode } from '@/lib/chat-format'

/**
 * Renders a message body: the Slack-style marks parsed in `lib/chat-format`,
 * plus clickable links.
 *
 * The link handling predates formatting and still earns its keep. A raw URL in
 * a plain <p> with `break-words` gets chopped mid-character into a ragged
 * block. Here the href stays intact while the *displayed* text is shortened in
 * the middle, so a long calendar link reads as `calendar.google.com/…/eventedit`
 * on one line.
 */

/** Longest link text we show before shortening the middle. */
const MAX_LINK_TEXT = 44

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

function renderInline(nodes: InlineNode[], onDark: boolean): ReactNode {
    return nodes.map((node, i) => {
        switch (node.type) {
            case 'text':
                return <Fragment key={i}>{node.value}</Fragment>

            case 'link':
                return (
                    <a
                        key={i}
                        href={node.href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={node.raw}
                        className={cn(
                            'underline underline-offset-2 font-medium transition-colors',
                            onDark
                                ? 'decoration-white/40 hover:decoration-white'
                                : 'text-accent decoration-accent/30 hover:decoration-accent'
                        )}
                    >
                        {displayText(node.raw)}
                    </a>
                )

            case 'code':
                return (
                    <code
                        key={i}
                        className={cn(
                            'px-1 py-0.5 rounded text-[0.85em] font-mono',
                            onDark
                                ? 'bg-white/15 text-white'
                                : 'bg-gray-100 text-gray-800 border border-gray-200/80'
                        )}
                    >
                        {node.value}
                    </code>
                )

            case 'bold':
                return <strong key={i} className="font-semibold">{renderInline(node.children, onDark)}</strong>

            case 'italic':
                return <em key={i}>{renderInline(node.children, onDark)}</em>

            case 'underline':
                return (
                    <span key={i} className="underline underline-offset-2">
                        {renderInline(node.children, onDark)}
                    </span>
                )

            case 'strike':
                return <s key={i} className="opacity-80">{renderInline(node.children, onDark)}</s>
        }
    })
}

function renderBlock(block: Block, key: number, onDark: boolean): ReactNode {
    switch (block.type) {
        case 'paragraph':
            return (
                // `overflow-wrap: anywhere` instead of `break-words`: it only
                // breaks a word when the line genuinely cannot fit, rather than
                // eagerly. `pre-wrap` keeps the sender's own line breaks.
                <p key={key} className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {renderInline(block.children, onDark)}
                </p>
            )

        case 'quote':
            return (
                <blockquote
                    key={key}
                    className={cn(
                        'pl-2.5 border-l-2 whitespace-pre-wrap [overflow-wrap:anywhere]',
                        onDark ? 'border-white/40 text-white/85' : 'border-gray-300 text-gray-500'
                    )}
                >
                    {renderInline(block.children, onDark)}
                </blockquote>
            )

        case 'codeblock':
            return (
                <pre
                    key={key}
                    className={cn(
                        'px-2.5 py-2 rounded-lg text-[13px] font-mono overflow-x-auto',
                        onDark
                            ? 'bg-black/20 text-white/95'
                            : 'bg-gray-50 text-gray-800 border border-gray-200'
                    )}
                >
                    <code>{block.value}</code>
                </pre>
            )

        case 'list':
            return (
                <ListTag
                    key={key}
                    ordered={block.ordered}
                    className={cn(
                        'pl-5 space-y-0.5',
                        block.ordered ? 'list-decimal' : 'list-disc'
                    )}
                >
                    {block.items.map((item, i) => (
                        <li key={i} className="[overflow-wrap:anywhere]">
                            {renderInline(item, onDark)}
                        </li>
                    ))}
                </ListTag>
            )
    }
}

function ListTag({
    ordered,
    className,
    children,
}: {
    ordered: boolean
    className: string
    children: ReactNode
}) {
    return ordered ? (
        <ol className={className}>{children}</ol>
    ) : (
        <ul className={className}>{children}</ul>
    )
}

interface RichTextProps {
    content: string
    /** Sent bubbles are navy, so links and code need a light treatment there. */
    onDark?: boolean
}

export default function RichText({ content, onDark = false }: RichTextProps) {
    const blocks = parseMessage(content)

    return (
        // space-y rather than margins on the blocks themselves, so a message
        // that is a single paragraph — almost all of them — adds no extra height.
        <div className="text-[15px] leading-relaxed space-y-2">
            {blocks.map((block, i) => renderBlock(block, i, onDark))}
        </div>
    )
}
