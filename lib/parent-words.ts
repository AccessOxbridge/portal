/** Copy for the parent pages, usable from server and client components. */

/** Claire for every family for now: name, title, photo and contact email. */
export const SUCCESS_MANAGER = {
    name: 'Claire Marlowe',
    title: 'Senior Strategist',
    photo: '/team/claire-marlowe.webp' as string | null,
    // The shared office inbox for now (Raj, 22 Oct).
    email: 'office@accessoxbridge.io',
}

/** How to refer to the child: by first name when we have it, never a pronoun. */
export function wordsFor(first: string | null) {
    return {
        child: first ?? 'your child',
        Child: first ?? 'Your child',
        childs: first ? `${first}’s` : 'your child’s',
        Childs: first ? `${first}’s` : 'Your child’s',
    }
}

export type ParentWords = ReturnType<typeof wordsFor>
