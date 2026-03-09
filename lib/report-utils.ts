/**
 * Strip any reference to AI summary, unavailability, or how the report was produced.
 * Used when saving new reports and when displaying to students so they never see such mentions.
 */
export function sanitizeReportContent(text: string): string {
    if (!text || typeof text !== 'string') return text
    const patterns = [
        /\s*While the AI summary was not available,?\s*/gi,
        /\s*Although the AI summary was not available,?\s*/gi,
        /\s*The AI summary was not available\.?\s*/gi,
        /\s*Since (?:the )?AI summary (?:was not available|is unavailable),?\s*/gi,
        /\s*When (?:the )?AI summary (?:is )?unavailable,?\s*/gi,
        /\s*\(?(?:AI summary|AI-generated summary) (?:was )?not available\)?\.?\s*/gi,
        /\s*Note:?\s*(?:the )?AI summary (?:was )?not available\.?\s*/gi,
        /\s*Without (?:an? )?AI summary,?\s*/gi,
        // Strip any mention of transcripts/recordings or video platform names.
        /\s*(?:based on|from|using|according to|as per|per)\s+(?:the\s+)?(?:zoom\s+)?(?:recording|transcript)\b[:,]?\s*/gi,
        /\s*(?:the\s+)?(?:zoom\s+)?(?:recording|transcript)\s+(?:shows|indicates|suggests|states|notes)\b[:,]?\s*/gi,
        /\bzoom\b/gi,
        /\btranscript\b/gi,
        /\brecording\b/gi,
    ]
    let out = text
    for (const p of patterns) {
        out = out.replace(p, ' ')
    }
    out = out.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ').trim()
    // Ensure a blank line between the closing sentence and "Best regards,"
    out = out.replace(/([^\n])\n(\s*Best regards,)/i, '$1\n\n$2')
    // Ensure a gap between "Best regards," and the mentor name
    out = out.replace(/\bBest regards,\s*\n([^\n]+)$/m, 'Best regards,\n\n$1')
    return out
}

const SECTION_AREAS = '## Areas for improvement'
const SECTION_NEXT = '## Next steps'

/** Detect if block already has markdown list syntax. */
function hasListSyntax(block: string): boolean {
    const trimmed = block.trim()
    return /^[\s]*[-*]\s+/m.test(trimmed) || /^[\s]*\d+\.\s+/m.test(trimmed)
}

/** Turn a plain paragraph or newline-separated lines into a bullet list. */
function toBulletList(block: string): string {
    const lines = block
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
    if (lines.length === 0) return block
    if (lines.length === 1 && !block.includes('. ')) return block
    const items =
        lines.length > 1
            ? lines
            : lines[0].split(/\.\s+/).map((s) => s.trim()).filter(Boolean)
    return items.map((item) => `- ${item.replace(/^[-*]\s*/, '')}`).join('\n')
}

/** Turn a plain paragraph or newline-separated lines into a numbered list. */
function toNumberedList(block: string): string {
    const lines = block
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
    if (lines.length === 0) return block
    if (lines.length === 1 && !block.includes('. ')) return block
    const items =
        lines.length > 1
            ? lines
            : lines[0].split(/\.\s+/).map((s) => s.trim()).filter(Boolean)
    return items.map((item, i) => `${i + 1}. ${item.replace(/^\d+\.\s*/, '')}`).join('\n')
}

/**
 * Normalize report markdown so "Areas for improvement" and "Next steps" render as
 * proper lists when they are stored as plain paragraphs or newline-separated lines.
 */
export function normalizeReportMarkdown(text: string): string {
    if (!text || typeof text !== 'string') return text
    let out = text

    const areasHeading = out.indexOf(SECTION_AREAS)
    if (areasHeading !== -1) {
        const afterHeading = out.slice(areasHeading + SECTION_AREAS.length)
        const nextSection = afterHeading.search(/\n##\s+/)
        const block = nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection)
        const content = block.replace(/^\s*\n+/, '').trim()
        if (content && !hasListSyntax(content)) {
            const bulletBlock = toBulletList(content)
            const rest = nextSection === -1 ? '' : afterHeading.slice(nextSection)
            out =
                out.slice(0, areasHeading + SECTION_AREAS.length) +
                '\n\n' +
                bulletBlock +
                rest
        }
    }

    const nextHeading = out.indexOf(SECTION_NEXT)
    if (nextHeading !== -1) {
        const afterHeading = out.slice(nextHeading + SECTION_NEXT.length)
        const nextSection = afterHeading.search(/\n##\s+/)
        const block = nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection)
        const content = block.replace(/^\s*\n+/, '').trim()
        if (content && !hasListSyntax(content)) {
            const numberedBlock = toNumberedList(content)
            const rest = nextSection === -1 ? '' : afterHeading.slice(nextSection)
            out =
                out.slice(0, nextHeading + SECTION_NEXT.length) +
                '\n\n' +
                numberedBlock +
                rest
        }
    }

    return out
}
