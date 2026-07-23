import { redirect } from 'next/navigation'

// Public self-signup is disabled: all accounts (students and mentors alike) are
// provisioned by admin/dev via Supabase. Anyone hitting /signup is sent to the
// login page. The former SignupForm is intentionally no longer rendered or
// imported, so the signup server action is not exposed to any served page.
export default function SignupPage() {
    redirect('/login')
}
