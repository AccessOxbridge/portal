export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect';

export interface OnboardingQuestion {
    id: string;
    label: string;
    type: QuestionType;
    required: boolean;
    options?: string[];
    placeholder?: string;
}

export const MENTOR_ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
    {
        id: 'bio',
        label: 'A brief bio about yourself',
        type: 'textarea',
        required: true,
        placeholder: 'Tell us about your experience and why you want to be a mentor...',
    },
    {
        id: 'expertise',
        label: 'Your areas of expertise',
        type: 'multiselect',
        required: true,
        options: [
            'Computer Science',
            'Mathematics',
            'Physics',
            'Chemistry',
            'Biology',
            'Economics',
            'History',
            'English Literature',
            'Law',
            'Medicine',
        ],
    },
    {
        id: 'years_experience',
        label: 'Years of mentoring experience',
        type: 'select',
        required: true,
        options: ['0-1', '1-3', '3-5', '5+'],
    },
    {
        id: 'linkedin_url',
        label: 'LinkedIn Profile URL',
        type: 'text',
        required: false,
        placeholder: 'https://www.linkedin.com/in/yourprofile',
    },
];
