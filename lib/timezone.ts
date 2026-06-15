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
