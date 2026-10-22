/** Copy for the parent pages, usable from server and client components. */

/** Claire for every family for now: name, title and contact email; no photo. */
export const SUCCESS_MANAGER = {
    name: 'Claire Marlowe',
    title: 'Senior Strategist',
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
