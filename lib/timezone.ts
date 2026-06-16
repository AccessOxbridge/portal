/**
 * Timezone defaults for the portal.
 *
 * The portal is UK-centric, so the baseline default is London. We still try to
 * honour the visitor's actual location: if the browser reports a valid IANA
 * timezone we use that instead, falling back to London when detection isn't
 * available (e.g. server-side render) or returns something unusable.
 *
 * Precedence for the *default* shown in pickers:
 *   1. A timezone the user has explicitly chosen (remembered locally)
 *   2. The browser-detected timezone
 *   3. London
 *
 * Once a user picks a timezone it is remembered, so auto-detection never
 * silently reverts their choice on a later visit.
 */
export const DEFAULT_TIMEZONE = 'Europe/London'

const STORAGE_KEY = 'oxbridge.timezone'

/** True when `tz` is a real IANA timezone the runtime understands. */
export function isValidTimezone(tz: string | null | undefined): tz is string {
    if (!tz) return false
    try {
        new Intl.DateTimeFormat('en-GB', { timeZone: tz })
        return true
    } catch {
        return false
    }
}

/** The browser-detected IANA timezone, or '' when it can't be determined. */
export function getBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    } catch {
        return ''
    }
}

/** The timezone the user last explicitly chose, or '' if none/invalid. */
export function getStoredTimezone(): string {
    try {
        const tz = window.localStorage.getItem(STORAGE_KEY)
        return isValidTimezone(tz) ? tz : ''
    } catch {
        return ''
    }
}

/**
 * Remember a timezone the user explicitly chose so it survives future visits
 * and wins over browser auto-detection. Invalid values are ignored.
 */
export function rememberTimezone(tz: string | null | undefined): void {
    if (!isValidTimezone(tz)) return
    try {
        window.localStorage.setItem(STORAGE_KEY, tz)
    } catch {
        // localStorage unavailable (private mode / SSR) — non-fatal.
    }
}

/**
 * Default timezone for a new user/form. A timezone the user previously chose
 * wins; otherwise the browser's timezone when detectable and valid; otherwise
 * {@link DEFAULT_TIMEZONE} (London).
 */
export function getDefaultTimezone(): string {
    const stored = getStoredTimezone()
    if (stored) return stored

    const browserTz = getBrowserTimezone()
    return isValidTimezone(browserTz) ? browserTz : DEFAULT_TIMEZONE
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Offset in ms of `timeZone` from UTC at a given instant (tz = UTC + offset). */
function tzOffsetMs(timeZone: string, instant: Date): number {
    const dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
    const parts = dtf.formatToParts(instant)
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    return asUTC - instant.getTime()
}

/**
 * Convert a wall-clock date + time *as read in `timeZone`* into a UTC ISO
 * string. e.g. ('2026-06-15', '18:30', 'Europe/London') → the instant that
 * shows as 18:30 in London (17:30Z in BST), regardless of the browser's own
 * timezone. Falls back to local interpretation if `timeZone` is unusable.
 */
export function zonedTimeToUtcISO(dateStr: string, timeStr: string, timeZone: string): string {
    if (!isValidTimezone(timeZone)) {
        return new Date(`${dateStr}T${timeStr}:00`).toISOString()
    }
    // Treat the wall time as if it were UTC, then back out the zone's offset.
    const naiveUTC = new Date(`${dateStr}T${timeStr}:00Z`)
    if (Number.isNaN(naiveUTC.getTime())) {
        return new Date(`${dateStr}T${timeStr}:00`).toISOString()
    }
    const offset = tzOffsetMs(timeZone, naiveUTC)
    let utc = new Date(naiveUTC.getTime() - offset)
    // Settle DST boundaries: re-evaluate the offset at the resolved instant.
    const offset2 = tzOffsetMs(timeZone, utc)
    if (offset2 !== offset) utc = new Date(naiveUTC.getTime() - offset2)
    return utc.toISOString()
}

/**
 * The current wall-clock date and time in `timeZone`, as
 * { date: 'YYYY-MM-DD', time: 'HH:MM' } (24-hour).
 */
export function getZonedNow(timeZone: string): { date: string; time: string } {
    const tz = isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

/**
 * Add `minutes` to a 'HH:MM' wall-clock time, wrapping past midnight.
 * Pure wall-clock arithmetic — timezone independent.
 */
export function addMinutesToWallTime(timeStr: string, minutes: number): string {
    const [h, m] = timeStr.split(':').map(Number)
    const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

/** Resolve a usable IANA zone, falling back to {@link DEFAULT_TIMEZONE}. */
function resolveTz(timeZone: string | null | undefined): string {
    return isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE
}

/**
 * Format the date of an instant in `timeZone` (falls back to London).
 * `iso` may be an ISO string or a Date.
 */
export function formatDateInTz(
    iso: string | Date | null | undefined,
    timeZone: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
): string {
    if (!iso) return ''
    const d = iso instanceof Date ? iso : new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-GB', { ...options, timeZone: resolveTz(timeZone) })
}

/**
 * Format the time of an instant in `timeZone` (falls back to London). When
 * `withZone` is true, appends the short zone label, e.g. "14:00 BST".
 */
export function formatTimeInTz(
    iso: string | Date | null | undefined,
    timeZone: string | null | undefined,
    { withZone = true }: { withZone?: boolean } = {}
): string {
    if (!iso) return ''
    const d = iso instanceof Date ? iso : new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: resolveTz(timeZone),
        ...(withZone ? { timeZoneName: 'short' } : {}),
    })
}

/** Convenience: "Mon, 16 Jun 2026, 14:00 BST" in `timeZone`. */
export function formatDateTimeInTz(
    iso: string | Date | null | undefined,
    timeZone: string | null | undefined
): string {
    if (!iso) return ''
    const date = formatDateInTz(iso, timeZone)
    const time = formatTimeInTz(iso, timeZone, { withZone: true })
    return date && time ? `${date}, ${time}` : date || time
}
