import type { ParentReport } from '@/lib/parent-dashboard'

/*
 * Examples shown to a parent before their child has any of the real thing
 * (parents can log in before the family has bought anything). Every place
 * that renders these labels them "Example", so they are never mistaken for
 * the child's own data. The names are made up.
 */

/** A strong example of the report a mentor writes after a session. */
export const EXAMPLE_REPORT: ParentReport = {
    id: 'example-report',
    dateLabel: 'Example Personal statement and course fit',
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

/** A non-interactive example showing where a session recording will appear. */
export const EXAMPLE_RECORDING = {
    title: 'Example session recording',
    mentorName: 'Hannah Reid',
}
