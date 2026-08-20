import { redirect } from 'next/navigation'

// Public self-signup is disabled: student accounts stay staff-provisioned.
// Mentors apply at /become-a-mentor. Anyone hitting /signup is sent to login.
// The former SignupForm is intentionally no longer rendered or imported.
export default function SignupPage() {
    redirect('/login')
}
