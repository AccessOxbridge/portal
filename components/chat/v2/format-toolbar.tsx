'use client'

import { Fragment } from 'react'
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    List,
    ListOrdered,
} from 'lucide-react'

/**
 * The formatting controls inside the composer.
 *
 * These drive a contenteditable (see `rich-composer`), so the work is handed to
 * the browser's own editing commands wherever one exists. That is what makes
 * the buttons behave the way people expect from every other editor: pressing
 * bold with nothing selected arms the next character, pressing a list button on
 * an empty line starts a list, and undo puts it all back.
 */

export type FormatCommand =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strike'
    | 'code'
    | 'bullet'
    | 'ordered'

/** execCommand's name for each, where it has one. `code` it does not. */
const NATIVE_COMMAND: Partial<Record<FormatCommand, string>> = {
    bold: 'bold',
    italic: 'italic',
    underline: 'underline',
    strike: 'strikeThrough',
    bullet: 'insertUnorderedList',
    ordered: 'insertOrderedList',
}

const BUTTONS: ReadonlyArray<{
    command: FormatCommand
    label: string
    hint?: string
    Icon: typeof Bold
    /** Starts a new group, drawn with a separator before it. */
    group?: boolean
}> = [
    { command: 'bold', label: 'Bold', hint: '⌘B', Icon: Bold },
    { command: 'italic', label: 'Italic', hint: '⌘I', Icon: Italic },
    { command: 'underline', label: 'Underline', hint: '⌘U', Icon: Underline },
    { command: 'strike', label: 'Strikethrough', hint: '⇧⌘X', Icon: Strikethrough },
    { command: 'code', label: 'Code', hint: '⇧⌘C', Icon: Code },
    { command: 'bullet', label: 'Bulleted list', Icon: List, group: true },
    { command: 'ordered', label: 'Numbered list', Icon: ListOrdered },
]

function closestElement(node: Node | null | undefined): HTMLElement | null {
    if (!node) return null
    return node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node.parentElement
}

/**
 * Inline code, which execCommand has no verb for. Toggles off when the caret is
 * already inside a code span, and with nothing selected leaves an empty span
 * with the caret in it so the next keystroke lands as code.
 */
function toggleCode(editor: HTMLElement) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const existing = closestElement(range.startContainer)?.closest('code')

    if (existing && editor.contains(existing)) {
        const parent = existing.parentNode
        if (!parent) return
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing)
        parent.removeChild(existing)
        parent.normalize()
        return
    }

    const code = document.createElement('code')

    if (range.collapsed) {
        // A zero-width space gives the empty span something to hold; the
        // serializer drops it again so it never reaches the message.
        code.appendChild(document.createTextNode('​'))
        range.insertNode(code)
    } else {
        try {
            range.surroundContents(code)
        } catch {
            // The selection crossed an element boundary, so it cannot be
            // wrapped in place — lift it out and re-insert it instead.
            code.appendChild(range.extractContents())
            range.insertNode(code)
        }
    }

    const next = document.createRange()
    next.selectNodeContents(code)
    next.collapse(false)
    selection.removeAllRanges()
    selection.addRange(next)
}

/** Run a command against the editor, which must already hold the selection. */
export function applyCommand(command: FormatCommand, editor: HTMLElement) {
    editor.focus()

    if (command === 'code') {
        toggleCode(editor)
        return
    }

    const native = NATIVE_COMMAND[command]
    if (!native) return

    try {
        // Tags rather than inline styles, so the serializer sees <b> and <i>
        // instead of a span carrying CSS.
        document.execCommand('styleWithCSS', false, 'false')
    } catch {
        // Firefox throws when the document isn't editable yet; harmless.
    }
    document.execCommand(native)
}

/**
 * Slack's bindings, so muscle memory carries over: ⌘B/I/U for the common three,
 * ⇧⌘X and ⇧⌘C for strikethrough and code.
 */
export function commandForEvent(e: React.KeyboardEvent): FormatCommand | null {
    if (!e.metaKey && !e.ctrlKey) return null
    const key = e.key.toLowerCase()

    if (e.shiftKey) {
        if (key === 'x') return 'strike'
        if (key === 'c') return 'code'
        return null
    }

    if (key === 'b') return 'bold'
    if (key === 'i') return 'italic'
    if (key === 'u') return 'underline'
    return null
}

interface FormatToolbarProps {
    onCommand: (command: FormatCommand) => void
    disabled?: boolean
}

export default function FormatToolbar({ onCommand, disabled = false }: FormatToolbarProps) {
    return (
        <div
            // Scrolls rather than wraps on a narrow phone, so the composer never
            // grows a second row and pushes the send button out of reach.
            className="flex items-center gap-0.5 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {BUTTONS.map(({ command, label, hint, Icon, group }) => (
                // A Fragment rather than a `display: contents` wrapper: WebKit
                // dropped such wrappers from the accessibility tree until
                // Safari 16 / iOS 17, which would have cost these buttons their
                // semantics on older phones. A Fragment emits no node at all.
                <Fragment key={command}>
                    {group && <span className="shrink-0 w-px h-4 bg-gray-200 mx-1" />}
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label={hint ? `${label} (${hint})` : label}
                        title={hint ? `${label}  ${hint}` : label}
                        // The editor must keep focus and, more importantly, its
                        // selection — a blur would collapse it before the
                        // command runs.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onCommand(command)}
                        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/[0.06] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                        <Icon className="w-[15px] h-[15px]" />
                    </button>
                </Fragment>
            ))}
        </div>
    )
}
