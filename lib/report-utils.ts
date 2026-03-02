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
    ]
    let out = text
    for (const p of patterns) {
        out = out.replace(p, ' ')
    }
    out = out.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ').trim()
    // Ensure a gap between "Best regards," and the mentor name
    out = out.replace(/\bBest regards,\s*\n([^\n]+)$/m, 'Best regards,\n\n$1')
    return out
}
