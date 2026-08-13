/**
 * Message formatting — the Slack/WhatsApp dialect, not Markdown.
 *
 * Messages are stored as plain text with the markers inline (`*bold*`), exactly
 * as typed. Nothing about the database or the API changes; this file is the one
 * place that decides what those characters mean.
 *
 * Why a hand-written parser instead of react-markdown: mentors and students
 * write prose, not markup, and full Markdown is too eager on their text. It
 * italicises the middle of `results_2024_final.pdf`, eats the asterisks in
 * "the *whole* point", and turns "I scored 1. Then..." into a list. Every mark
 * below is therefore gated on a word boundary — a delimiter only opens when it
 * is preceded by a non-word character and followed by a non-space, and only
 * closes under the mirror of that rule. So `snake_case_name` and `3 * 4 * 5`
 * survive untouched, which is the property that made plain text the safer
 * default here in the first place.
 *
 * Supported, in both the Slack and the Markdown spelling where they differ:
 *
 *   *bold*   **bold**       _italic_        ~strike~   ~~strike~~
 *   __underline__           `code`          ```block```
 *   > quote                 - bullet        1. numbered
 *
 * The one deliberate divergence from Markdown: `__text__` is underline, not
 * bold. Slack has no underline marker at all and we need one, so the double
 * underscore — which nobody types by accident — carries it.
 */

/** Inline marks, longest spelling first so `**` wins over `*`. */
const DELIMITERS: ReadonlyArray<readonly [string, MarkType]> = [
    ['**', 'bold'],
    ['__', 'underline'],
    ['~~', 'strike'],
    ['*', 'bold'],
    ['_', 'italic'],
    ['~', 'strike'],
]

/**
 * Anchored (sticky) so it can be tested at one exact offset during the scan
 * rather than searched for. Matches bare URLs, www-prefixed hosts and emails.
 */
const LINK_AT =
    /(?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?'"]|[\w.+-]+@[\w-]+\.[\w.-]+/y

const BULLET_LINE = /^\s*[-*•]\s+(.*)$/
// Two digits max: enough for any list typed in chat, and it stops a sentence
// opening with a year ("2024. What a year") from becoming a numbered item.
const ORDERED_LINE = /^\s*\d{1,2}[.)]\s+(.*)$/
const QUOTE_LINE = /^\s*>\s?/

type MarkType = 'bold' | 'italic' | 'underline' | 'strike'

export type InlineNode =
    | { type: 'text'; value: string }
    | { type: 'code'; value: string }
    | { type: 'link'; href: string; raw: string }
    | { type: MarkType; children: InlineNode[] }

export type Block =
    | { type: 'paragraph'; children: InlineNode[] }
    | { type: 'quote'; children: InlineNode[] }
    | { type: 'codeblock'; value: string }
    | { type: 'list'; ordered: boolean; items: InlineNode[][] }

const isWordChar = (char: string | undefined) => !!char && /[\w]/.test(char)
const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char)

/** Where a bare match should actually point once clicked. */
export function toHref(raw: string): string {
    if (raw.includes('@') && !raw.includes('/')) return `mailto:${raw}`
    if (raw.startsWith('www.')) return `https://${raw}`
    return raw
}

/**
 * A delimiter opens a mark only when it hugs the text it is marking: nothing
 * word-like behind it, no space in front. `a*b*c` and `x _ y` both fail here.
 */
function opensAt(text: string, index: number, delimiter: string): boolean {
    if (!text.startsWith(delimiter, index)) return false
    if (isWordChar(text[index - 1])) return false
    return !isSpace(text[index + delimiter.length])
}

/** The mirror rule, plus a guard against empty marks like `**`. */
function findClose(text: string, from: number, delimiter: string): number {
    for (let j = from; j <= text.length - delimiter.length; j++) {
        if (text[j] === '`') {
            // Don't let a mark close inside a code span — the backticks own it.
            const end = text.indexOf('`', j + 1)
            if (end !== -1) {
                j = end
                continue
            }
        }
        if (!text.startsWith(delimiter, j)) continue
        if (j === from) continue
        if (isSpace(text[j - 1])) continue
        if (isWordChar(text[j + delimiter.length])) continue
        return j
    }
    return -1
}

/**
 * Tokenise one run of text. Anything that fails its boundary test falls through
 * and is emitted as literal characters, which is what keeps filenames intact.
 */
export function parseInline(text: string): InlineNode[] {
    const nodes: InlineNode[] = []
    let buffer = ''
    let i = 0

    const flush = () => {
        if (buffer) {
            nodes.push({ type: 'text', value: buffer })
            buffer = ''
        }
    }

    outer: while (i < text.length) {
        const char = text[i]

        // Code spans are opaque — no marks are read inside them.
        if (char === '`') {
            const end = text.indexOf('`', i + 1)
            if (end > i + 1) {
                flush()
                nodes.push({ type: 'code', value: text.slice(i + 1, end) })
                i = end + 1
                continue
            }
        }

        if (char === 'h' || char === 'w' || /[\w.+-]/.test(char)) {
            LINK_AT.lastIndex = i
            const match = LINK_AT.exec(text)
            // Guard against matching the tail of a word we're already inside.
            if (match && !isWordChar(text[i - 1])) {
                flush()
                nodes.push({ type: 'link', href: toHref(match[0]), raw: match[0] })
                i += match[0].length
                continue
            }
        }

        for (const [delimiter, type] of DELIMITERS) {
            if (!opensAt(text, i, delimiter)) continue
            const close = findClose(text, i + delimiter.length, delimiter)
            if (close === -1) continue

            flush()
            nodes.push({
                type,
                children: parseInline(text.slice(i + delimiter.length, close)),
            })
            i = close + delimiter.length
            continue outer
        }

        buffer += char
        i++
    }

    flush()
    return nodes
}

/**
 * Split a message into blocks. Consecutive plain lines stay in one paragraph
 * with their newlines intact — the renderer keeps `whitespace-pre-wrap`, so a
 * hard-wrapped paragraph still looks the way the sender typed it.
 */
export function parseMessage(raw: string): Block[] {
    const lines = raw.split('\n')
    const blocks: Block[] = []
    let paragraph: string[] = []
    let i = 0

    const flushParagraph = () => {
        if (paragraph.length === 0) return
        blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) })
        paragraph = []
    }

    while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()

        if (trimmed.startsWith('```')) {
            flushParagraph()

            // One-liner form: ```const x = 1```
            if (trimmed.length > 6 && trimmed.endsWith('```')) {
                blocks.push({ type: 'codeblock', value: trimmed.slice(3, -3).trim() })
                i++
                continue
            }

            const body: string[] = []
            i++
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                body.push(lines[i])
                i++
            }
            i++ // the closing fence, or past the end if it was never typed
            blocks.push({ type: 'codeblock', value: body.join('\n') })
            continue
        }

        if (QUOTE_LINE.test(line)) {
            flushParagraph()
            const body: string[] = []
            while (i < lines.length && QUOTE_LINE.test(lines[i])) {
                body.push(lines[i].replace(QUOTE_LINE, ''))
                i++
            }
            blocks.push({ type: 'quote', children: parseInline(body.join('\n')) })
            continue
        }

        const ordered = ORDERED_LINE.test(line)
        if (ordered || BULLET_LINE.test(line)) {
            flushParagraph()
            const pattern = ordered ? ORDERED_LINE : BULLET_LINE
            const items: InlineNode[][] = []
            while (i < lines.length) {
                const match = pattern.exec(lines[i])
                if (!match) break
                items.push(parseInline(match[1]))
                i++
            }
            blocks.push({ type: 'list', ordered, items })
            continue
        }

        if (trimmed === '') {
            flushParagraph()
            i++
            continue
        }

        paragraph.push(line)
        i++
    }

    flushParagraph()
    return blocks
}

function inlineText(nodes: InlineNode[]): string {
    return nodes
        .map((node) => {
            if (node.type === 'text') return node.value
            if (node.type === 'code') return node.value
            if (node.type === 'link') return node.raw
            return inlineText(node.children)
        })
        .join('')
}

/**
 * Markers removed, for places that show a one-line summary — the conversation
 * list, notification titles. Runs the real parser rather than a pile of regex
 * replacements so a preview can never disagree with the rendered bubble.
 */
export function stripFormatting(raw: string): string {
    return parseMessage(raw)
        .map((block) => {
            switch (block.type) {
                case 'codeblock':
                    return block.value
                case 'list':
                    return block.items.map(inlineText).join(' ')
                default:
                    return inlineText(block.children)
            }
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
}

// ---------------------------------------------------------------------------
// Editor HTML
//
// The composer is a contenteditable surface showing formatted text, so it needs
// the markers turned into elements. It walks lines directly rather than going
// through `parseMessage`, because the editor has to round-trip exactly — blank
// lines between paragraphs are content there, and the block AST drops them.
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * Inline nodes as editor elements. Links stay plain text on purpose: an <a> in
 * a contenteditable is miserable to type at the end of, and the URL autolinks
 * again the moment the message is rendered.
 */
function inlineHtml(nodes: InlineNode[]): string {
    return nodes
        .map((node) => {
            switch (node.type) {
                case 'text':
                    return escapeHtml(node.value)
                case 'link':
                    return escapeHtml(node.raw)
                case 'code':
                    return `<code>${escapeHtml(node.value)}</code>`
                case 'bold':
                    return `<strong>${inlineHtml(node.children)}</strong>`
                case 'italic':
                    return `<em>${inlineHtml(node.children)}</em>`
                case 'underline':
                    return `<u>${inlineHtml(node.children)}</u>`
                case 'strike':
                    return `<s>${inlineHtml(node.children)}</s>`
            }
        })
        .join('')
}

/** One line's worth of marked-up text, with no block wrapper around it. */
export function markersToInlineHtml(raw: string): string {
    return inlineHtml(parseInline(raw))
}

/** A full message as editor HTML — one block element per line. */
export function markersToHtml(raw: string): string {
    if (!raw) return ''

    const lines = raw.split('\n')
    const out: string[] = []
    let i = 0

    const line = (html: string) => `<div>${html || '<br>'}</div>`

    while (i < lines.length) {
        const current = lines[i]
        const trimmed = current.trim()

        if (trimmed.startsWith('```')) {
            if (trimmed.length > 6 && trimmed.endsWith('```')) {
                out.push(`<pre>${escapeHtml(trimmed.slice(3, -3).trim())}</pre>`)
                i++
                continue
            }
            const body: string[] = []
            i++
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                body.push(lines[i])
                i++
            }
            i++
            out.push(`<pre>${escapeHtml(body.join('\n'))}</pre>`)
            continue
        }

        if (QUOTE_LINE.test(current)) {
            const body: string[] = []
            while (i < lines.length && QUOTE_LINE.test(lines[i])) {
                body.push(line(markersToInlineHtml(lines[i].replace(QUOTE_LINE, ''))))
                i++
            }
            out.push(`<blockquote>${body.join('')}</blockquote>`)
            continue
        }

        const ordered = ORDERED_LINE.test(current)
        if (ordered || BULLET_LINE.test(current)) {
            const pattern = ordered ? ORDERED_LINE : BULLET_LINE
            const items: string[] = []
            while (i < lines.length) {
                const match = pattern.exec(lines[i])
                if (!match) break
                items.push(`<li>${markersToInlineHtml(match[1]) || '<br>'}</li>`)
                i++
            }
            out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
            continue
        }

        out.push(line(markersToInlineHtml(current)))
        i++
    }

    return out.join('')
}
