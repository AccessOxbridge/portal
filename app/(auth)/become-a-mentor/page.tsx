import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { MentorRegisterForm } from './MentorRegisterForm'

export default async function BecomeAMentorPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        redirect('/dashboard')
    }

    const params = await searchParams
    return <MentorRegisterForm error={params.error} />
}
