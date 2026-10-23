import type { ParentReport, ProgressPoint } from '@/lib/parent-dashboard'

/*
 * Examples shown to a parent before their child has any of the real thing
 * (parents can log in before the family has bought anything). Every place
 * that renders these labels them "Example", so they are never mistaken for
 * the child's own data. The names are made up.
 */

/** A strong example of the report a mentor writes after a session. */
export const EXAMPLE_REPORT: ParentReport = {
    id: 'example-report',
    dateLabel: 'Personal statement and course fit',
    mentorName: 'Hannah Reid',
    summary:
        'Alex and Hannah spent the session on Alex’s personal statement for History at Cambridge, focusing on the second paragraph and how it connects to the course. Alex compared two drafts and explained clearly why the version built around their own reading on the Industrial Revolution shows more independent thinking. They then used the Cambridge Guide to Courses to link that interest to the first-year papers, so the statement now reads as preparation for the degree rather than a list of books.',
    keyPoints: [
        'Chose the stronger draft of paragraph two and explained why in their own words',
        'Linked their reading on the Industrial Revolution to the first-year economic and social history papers',
        'Asked sharp questions about how tutors read a statement, and took notes throughout',
    ],
    nextSteps: [
        'Redraft paragraph two using the structure agreed in the session, aiming for around 120 words',
        'Add one sentence on what the museum placement taught them about working with sources',
        'Send the full draft to their teacher before the school’s internal deadline',
        'Bring two questions about Cambridge interviews to the next session',
    ],
    fullReport: [
        'Alex, this was a really productive session. You came prepared with both drafts and a clear sense of what you wanted from the hour, and it showed in how quickly we made progress.',
        '',
        '## Session summary',
        '',
        'We focused on the second paragraph of your personal statement. Comparing the two drafts side by side, you spotted for yourself that the first one describes what you read, while the second shows what you *thought* about it. That is exactly the shift tutors look for. We then opened the Cambridge Guide to Courses together and matched your interest in the Industrial Revolution to the economic and social history papers in Part I, which gives your statement a natural link to the degree itself.',
        '',
        '## What went well',
        '',
        '- You chose the stronger draft and explained your reasons clearly, without needing prompting.',
        '- Your link between your reading and the first-year papers is specific and convincing.',
        '- Your questions about how tutors read statements were thoughtful and showed real engagement.',
        '',
        '## Areas to develop',
        '',
        '- Two sentences in the paragraph still list activities without saying what you learned from them. Keep the activity, but finish each sentence with the insight it gave you.',
        '- The paragraph is a little long. Cutting it to around 120 words will make the argument sharper.',
        '',
        '## Next steps',
        '',
        '1. Redraft paragraph two using the structure we agreed: idea, evidence from your reading, then what it made you think.',
        '2. Add one sentence on what the museum placement taught you about working with sources.',
        '3. Send the full draft to your teacher before the school’s internal deadline.',
        '4. Bring two questions about Cambridge interviews to our next session, and we will start preparing for them.',
        '',
        'You are in a strong position, Alex. The thinking is there; now it is about making every sentence show it.',
        '',
        'Best wishes,',
        '',
        'Hannah',
    ].join('\n'),
}

/** An example of the progress line once sessions are under way. */
export const EXAMPLE_PROGRESS: { points: ProgressPoint[]; total: number; planLabel: string } = {
    points: [0, 1, 2, 4, 5, 6, 8, 9, 11, 12].map((completed, i) => ({
        label: `Week ${i + 1}`,
        completed,
        plan: Math.round((i + 1) * 1.25 * 10) / 10,
    })),
    total: 12,
    planLabel: '1 session a week',
}

/**
 * An example session recording. Placeholder clip until the team's own
 * example recording is ready (then: a private Supabase Storage object played
 * through a signed link, like real recordings).
 */
export const EXAMPLE_RECORDING = {
    // CC0 sample clip from MDN, standing in for the real example.
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    title: 'Example session recording',
    mentorName: 'Hannah Reid',
    note: 'A sample to show how recordings play here. Your child’s own sessions appear in this list a few minutes after each one ends.',
}
