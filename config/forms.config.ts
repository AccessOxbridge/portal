/**
 * Form field configurations for post-session forms.
 * Update these as needed - no code changes required!
 */

export interface FormField {
    id: string
    type: 'text' | 'textarea' | 'rating' | 'select'
    label: string
    description?: string
    required: boolean
    options?: string[] // For select fields
}

export const MENTOR_REPORT_FORM: { title: string; fields: FormField[] } = {
    title: "Session Report",
    fields: [
        {
            id: "overall_rating",
            type: "rating",
            label: "Overall Session Quality",
            description: "How would you rate the overall session?",
            required: true,
        },
        {
            id: "student_engagement",
            type: "select",
            label: "Student Engagement Level",
            description: "How engaged was the student during the session?",
            required: true,
            options: ["Low", "Medium", "High", "Excellent"],
        },
        {
            id: "topics_covered",
            type: "textarea",
            label: "Topics Covered",
            description: "What topics or areas did you cover in this session?",
            required: true,
        },
        {
            id: "areas_of_improvement",
            type: "textarea",
            label: "Areas for Improvement",
            description: "What should the student focus on improving?",
            required: true,
        },
        {
            id: "next_steps",
            type: "textarea",
            label: "Recommended Next Steps",
            description: "What should the student do before the next session?",
            required: true,
        },
        {
            id: "additional_notes",
            type: "textarea",
            label: "Additional Notes",
            description: "Anything else you'd like to add?",
            required: false,
        },
    ],
}

/**
 * The student's post-session feedback is no longer config-driven: it is a
 * single shared card (components/feedback/session-rating-card.tsx) used by both
 * the dashboard popup and the feedback page, with one star rating, optional
 * reasons on a low score, and an optional comment. STUDENT_FEEDBACK_FORM was
 * removed with the multi-step wizard that read it.
 */
