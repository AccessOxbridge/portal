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

export const STUDENT_FEEDBACK_FORM: { title: string; fields: FormField[] } = {
    title: "Session Feedback (Optional)",
    fields: [
        {
            id: "mentor_rating",
            type: "rating",
            label: "How would you rate your mentor?",
            required: true,
        },
        {
            id: "session_helpful",
            type: "select",
            label: "Was this session helpful?",
            required: true,
            options: ["Not at all", "Somewhat", "Very helpful", "Extremely helpful"],
        },
        {
            id: "experience",
            type: "textarea",
            label: "Tell us about your experience",
            description: "What did you enjoy? What could be improved?",
            required: false,
        },
    ],
}
