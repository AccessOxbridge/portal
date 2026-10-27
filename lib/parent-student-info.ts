/*
 * The "Student profile" a parent fills in on the Progress Tracker: a few
 * details about their child and documents for the academic team. Shared by
 * the form (client) and the routes under /api/parent (server), so both check
 * the same limits.
 */

export const DOCUMENTS_BUCKET = 'parent-documents'
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const MAX_DOCUMENTS = 20

/** What the bucket accepts; the bucket enforces the same list. */
export const DOCUMENT_TYPES: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'image/heic': 'Image',
    'image/webp': 'Image',
}
export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp'

export const YEAR_GROUPS = ['Year 10', 'Year 11', 'Year 12', 'Year 13', 'Gap year', 'Other'] as const
export const UNIVERSITY_PREFERENCES = [
    { value: 'oxford', label: 'Oxford' },
    { value: 'cambridge', label: 'Cambridge' },
    { value: 'undecided', label: 'Not sure yet' },
] as const

export interface StudentInfo {
    childFirstName: string
    childLastName: string
    school: string
    yearGroup: string
    subjects: string
    courseInterest: string
    universityPreference: string
    notes: string
}

export interface ParentDocument {
    id: string
    fileName: string
    mimeType: string
    sizeBytes: number
    createdAt: string
}

const LIMITS: Record<keyof StudentInfo, number> = {
    childFirstName: 60,
    childLastName: 60,
    school: 120,
    yearGroup: 40,
    subjects: 300,
    courseInterest: 120,
    universityPreference: 20,
    notes: 2000,
}

/** Trimmed, length-checked student info, or the first problem found. */
export function parseStudentInfo(input: unknown): { info: StudentInfo } | { error: string } {
    const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
    const info = {} as StudentInfo
    for (const key of Object.keys(LIMITS) as (keyof StudentInfo)[]) {
        const value = typeof raw[key] === 'string' ? (raw[key] as string).trim() : ''
        if (value.length > LIMITS[key]) return { error: 'One of the answers is too long' }
        info[key] = value
    }
    if (!info.childFirstName) return { error: 'Please add your child’s first name' }
    if (info.yearGroup && !(YEAR_GROUPS as readonly string[]).includes(info.yearGroup)) return { error: 'Please choose a year group' }
    if (info.universityPreference && !UNIVERSITY_PREFERENCES.some((u) => u.value === info.universityPreference)) {
        return { error: 'Please choose Oxford, Cambridge or not sure yet' }
    }
    return { info }
}

/** A file name safe to use in a storage path: letters, digits, dot, dash, underscore. */
export function safeFileName(name: string): string {
    const cleaned = name.normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').replace(/^[._]+/, '')
    return (cleaned || 'document').slice(-100)
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
