/**
 * Pull a mentor's avatar out of a `photo_url:mentors(photo_url)` embed.
 *
 * Mentors keep their photo on `mentors.photo_url`; `profiles.photo_url` is null
 * for every mentor, so the embed is the only source. PostgREST treats
 * profiles→mentors as a to-one relationship (mentors.id is both primary key and
 * the foreign key to profiles.id) and therefore returns an OBJECT, not an
 * array. Several pages indexed `[0]` into it and silently got `undefined`,
 * which is why mentor avatars fell back to the placeholder everywhere.
 *
 * Both shapes are handled here so this keeps working if a query is ever written
 * with a to-many embed instead.
 */
export function getMentorPhotoUrl(mentor: unknown): string | null {
    const embedded = (mentor as { photo_url?: unknown } | null | undefined)?.photo_url
    if (!embedded) return null

    // Some queries select profiles.photo_url directly rather than embedding.
    if (typeof embedded === 'string') return embedded

    if (Array.isArray(embedded)) {
        return (embedded[0] as { photo_url?: string } | undefined)?.photo_url ?? null
    }

    return (embedded as { photo_url?: string }).photo_url ?? null
}
