'use client'

import { useEffect } from 'react'
import { cn } from '@/utils/lib'
import { markersToHtml, markersToInlineHtml } from '@/lib/chat-format'

/**
 * The composer surface: a contenteditable that shows bold as bold.
 *
 * It used to be a <textarea>, which meant the sender stared at `**Primary
 * Inbox**` while the recipient saw **Primary Inbox**. The markers are still the
 * storage format — this component just never shows them, converting to elements
 * on the way in and back to markers on the way out. `value` is always a marker
 * string, so drafts, the retry path and the API are all unchanged.
 *
 * Formatting commands go through `execCommand`. It is deprecated and every
 * browser still implements it for contenteditable; more to the point it is the
 * only route that keeps the caret, the selection, undo and IME composition
 * behaving natively, none of which is worth reimplementing here.
 */

/** Tags that end a line, as opposed to marking a run of text inside one. */
const BLOCK_TAGS = new Set([
    'DIV', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
])

/** Element → the marker that wraps it. Covers what execCommand emits. */
const MARK_FOR_TAG: Record<string, string> = {
    B: '*', STRONG: '*',
    I: '_', EM: '_',
    U: '__',
    S: '~', STRIKE: '~', DEL: '~',
    CODE: '`',
}

/**
 * Browsers disagree on what bold looks like. Chrome and Firefox produce `<b>`
 * and `<i>`; Safari ignores `styleWithCSS` and writes an `Apple-style-span`
 * carrying inline CSS instead, and it can carry several styles at once — so
 * this returns every marker that applies, not the first one it finds. Missing
 * this is how bold-plus-italic silently loses its italic on Safari only.
 */
function marksFor(el: HTMLElement): string[] {
    const direct = MARK_FOR_TAG[el.tagName]
    if (direct) return [direct]

    const style = el.style
    if (!style) return []

    const marks: string[] = []
    const weight = style.fontWeight
    if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) marks.push('*')
    if (style.fontStyle === 'italic') marks.push('_')

    // Read the shorthand as well as the longhand: which one carries the value
    // depends on how the browser wrote the declaration.
    const decoration = `${style.textDecorationLine ?? ''} ${style.textDecoration ?? ''}`
    if (decoration.includes('line-through')) marks.push('~')
    if (decoration.includes('underline')) marks.push('__')

    return marks
}

function serializeInline(node: Node): string {
    // The zero-width space only exists to give an empty code span something to
    // hold on to (see the toolbar); it must never reach the message.
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue ?? '').replace(/\u200B/g, '')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node as HTMLElement
    if (el.tagName === 'BR') return '\n'

    const inner = Array.from(el.childNodes).map(serializeInline).join('')
    const marks = marksFor(el)

    // An empty mark would serialise to a bare `**`, which reads as literal
    // asterisks on the way back in.
    if (marks.length === 0 || inner.trim() === '') return inner
    return marks.reduce((wrapped, mark) => `${mark}${wrapped}${mark}`, inner)
}

function serializeBlock(el: HTMLElement, out: string[]) {
    switch (el.tagName) {
        case 'UL':
        case 'OL': {
            const ordered = el.tagName === 'OL'
            let index = 0
            for (const child of Array.from(el.children)) {
                if (child.tagName !== 'LI') continue
                index++
                const text = serializeInline(child).trim()
                out.push(ordered ? `${index}. ${text}` : `- ${text}`)
            }
            return
        }

        case 'BLOCKQUOTE': {
            const lines: string[] = []
            collectChildren(el, lines)
            for (const line of lines) out.push(`> ${line}`)
            return
        }

        case 'PRE': {
            out.push('```')
            out.push(...(el.textContent ?? '').split('\n'))
            out.push('```')
            return
        }

        default:
            // `<div><br></div>` is how a browser spells a blank line; the
            // trailing newline it yields would otherwise double up.
            out.push(serializeInline(el).replace(/\n$/, ''))
    }
}

/**
 * Walk a parent's children, keeping runs of inline siblings on one line. A
 * browser commonly leaves the first line unwrapped as loose text and inline
 * elements — `<strong>a</strong><em>b</em><div>next</div>` — and those first two
 * belong to the same line, not to two.
 */
function collectChildren(parent: Node, out: string[]) {
    let buffer = ''

    const flush = () => {
        if (buffer === '') return
        out.push(...buffer.split('\n'))
        buffer = ''
    }

    for (const node of Array.from(parent.childNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as HTMLElement).tagName)) {
            flush()
            serializeBlock(node as HTMLElement, out)
        } else {
            buffer += serializeInline(node)
        }
    }

    flush()
}

/** Read the editor back out as a marker string. */
export function serializeEditor(root: HTMLElement): string {
    const out: string[] = []
    collectChildren(root, out)
    return out.join('\n').replace(/[ \t]+$/gm, '')
}

interface RichComposerProps {
    editorRef: React.RefObject<HTMLDivElement | null>
    /** Marker string, not HTML. */
    value: string
    onChange: (value: string) => void
    onSend: () => void
    placeholder: string
    disabled?: boolean
    onFocusChange?: (focused: boolean) => void
    onFiles?: (files: File[]) => void
}

export default function RichComposer({
    editorRef,
    value,
    onChange,
    onSend,
    placeholder,
    disabled = false,
    onFocusChange,
    onFiles,
}: RichComposerProps) {
    // Re-seed the editor only when `value` disagrees with what is already on
    // screen. Comparing against the live DOM rather than a remembered copy means
    // this is self-correcting: typing and toolbar commands leave the two in
    // agreement and nothing is rewritten, so the caret never jumps, while a send
    // that clears the draft or a failure that restores it does redraw.
    useEffect(() => {
        const el = editorRef.current
        if (!el || serializeEditor(el) === value) return
        el.innerHTML = markersToHtml(value)
    }, [value, editorRef])

    const emit = () => {
        const el = editorRef.current
        if (el) onChange(serializeEditor(el))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter') return

        if (!e.shiftKey) {
            e.preventDefault()
            onSend()
            return
        }

        // Shift+Enter inside a list should continue the list rather than drop a
        // <br> inside the current bullet.
        const selection = window.getSelection()
        const anchor = selection?.anchorNode
        const inList =
            anchor &&
            (anchor.nodeType === Node.ELEMENT_NODE
                ? (anchor as HTMLElement)
                : anchor.parentElement
            )?.closest('li')

        if (inList) {
            e.preventDefault()
            document.execCommand('insertParagraph')
            emit()
        }
        // Otherwise the browser's own line break is exactly right.
    }

    /**
     * Paste as plain text, then re-apply our own formatting to it. Two reasons:
     * foreign HTML would drag another site's fonts and colours into the
     * composer, and text copied out of a Markdown-speaking tool arrives as
     * `**bold**`, which should land here already bold.
     */
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const files = Array.from(e.clipboardData.files)
        if (files.length > 0 && onFiles) {
            e.preventDefault()
            onFiles(files)
            return
        }

        const text = e.clipboardData.getData('text/plain')
        if (!text) return

        e.preventDefault()
        // A single-line paste is usually mid-sentence, so it must not be
        // wrapped in a block or it would break the line it lands in.
        const html = text.includes('\n') ? markersToHtml(text) : markersToInlineHtml(text)
        document.execCommand('insertHTML', false, html)
        emit()
    }

    return (
        <div className="relative">
            {!value && (
                // A real element rather than `:empty::before` — a contenteditable
                // is rarely truly empty once it has been typed in and cleared.
                <span className="pointer-events-none absolute left-3.5 top-3 text-[16px] md:text-[15px] text-gray-400 select-none">
                    {placeholder}
                </span>
            )}

            <div
                ref={editorRef}
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder}
                contentEditable={!disabled}
                suppressContentEditableWarning
                onInput={emit}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => onFocusChange?.(true)}
                onBlur={() => onFocusChange?.(false)}
                className={cn(
                    // 16px on phones is not a design choice: iOS Safari zooms the whole
                    // viewport when a focused editable renders any smaller, and it
                    // never zooms back out. Desktop keeps the intended 15px.
                    'w-full max-h-[140px] overflow-y-auto px-3.5 pt-3 pb-1 text-[16px] md:text-[15px] leading-relaxed',
                    'focus:outline-none [overflow-wrap:anywhere] whitespace-pre-wrap',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
                    '[&_code]:bg-gray-100 [&_code]:border [&_code]:border-gray-200/80 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono',
                    '[&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:rounded-lg [&_pre]:px-2.5 [&_pre]:py-2 [&_pre]:text-[13px] [&_pre]:font-mono',
                    '[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2.5 [&_blockquote]:text-gray-500',
                    '[&_strong]:font-semibold',
                    disabled && 'opacity-50'
                )}
            />
        </div>
    )
}
