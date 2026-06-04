import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Greeting name: prefer full name (profile, then auth metadata); else first name only. */
export function getGreetingName(
  profileFullName?: string | null,
  metadataFullName?: string | null,
  email?: string | null,
  defaultLabel = 'Student'
): string {
  const candidates = [profileFullName, metadataFullName]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))

  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) =>
      b.split(/\s+/).filter(Boolean).length > a.split(/\s+/).filter(Boolean).length ? b : a
    )
    const parts = best.split(/\s+/).filter(Boolean)
    return parts.length >= 2 ? parts.join(' ') : parts[0]!
  }

  const local = email?.split('@')[0]?.trim()
  if (local) {
    const first = local.split(/[._-]/)[0]
    if (first) return first.charAt(0).toUpperCase() + first.slice(1)
  }

  return defaultLabel
}
