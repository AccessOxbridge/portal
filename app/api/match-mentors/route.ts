import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { strengths, weaknesses, requirements, timeSlots, anythingElse } = await req.json()

        // 2. Prepare text for embedding
        const studentProfileText = `
            Student Requirements:
            Strengths: ${strengths}
            Weaknesses: ${weaknesses}
            Mentor Requirements: ${requirements}
            Additional Info: ${anythingElse}
        `.trim()

        // 3. Generate Embedding
        const openai = new OpenAI({
            apiKey: process.env.OPEN_AI_API_KEY,
        })

        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: studentProfileText,
        })
        const embedding = embeddingResponse.data[0].embedding

        // 4. Search for top 5 mentors via RPC
        const { data: matches, error: matchError } = await supabase.rpc('match_mentors', {
            query_embedding: `[${embedding.join(',')}]`,
            match_threshold: 0.2,
            match_count: 4,
        })

        console.log('\n\nMatches:\n', JSON.stringify(matches, null, 2), '\n\n')
        console.log('\n\nMatch Error:\n', JSON.stringify(matchError, null, 2), '\n\n')

        if (matchError) throw matchError

        if (!matches || matches.length === 0) {
            return NextResponse.json({ error: 'No suitable mentors found at this time.' }, { status: 404 })
        }

        // 5. Create mentorship requests
        const requests = matches.map((mentor: any) => ({
            student_id: user.id,
            mentor_id: mentor.id,
            responses: { strengths, weaknesses, requirements, timeSlots, anythingElse },
            status: 'pending'
        }))

        const { error: insertError } = await supabase
            .from('mentorship_requests')
            .insert(requests)

        if (insertError) throw insertError

        // 6. Create notifications for mentors
        // We fetch emails from profiles (previously synced)
        const mentorIds = matches.map((m: any) => m.id)
        const { data: mentorProfiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', mentorIds)

        if (mentorProfiles) {
            const notifications = mentorProfiles.map((profile: any) => ({
                recipient_id: profile.id,
                recipient_email: profile.email || '',
                type: 'mentorship_request' as const,
                title: 'New Mentorship Request',
                message: `You have received a new mentorship request from ${user.user_metadata?.full_name || 'a student'}. Please review and accept/reject within 24 hours.`,
                data: {
                    student_id: user.id,
                    student_name: user.user_metadata?.full_name || 'Student'
                }
            }))

            await supabase.from('notifications').insert(notifications)
        }

        return NextResponse.json({ success: true, count: matches.length })

    } catch (error: any) {
        console.error('Match API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
