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

        const body = await req.json()
        const {
            // New student onboarding fields
            schoolName,
            schoolCountry,
            curriculum,
            curriculumOther,
            subjects,
            targetUniversities,
            timezone,
            academicInterests,
            extracurriculars,
            anythingElse,
            parentEmail,

            // Backwards-compatible fields (if older clients still send them)
            strengths,
            weaknesses,
            requirements,
            timeSlots: timeSlotsFromBody
        } = body

        const timeSlots = timeSlotsFromBody || body?.availability || []

        // 2. Check user's credit balance (REMOVED - moved to sessions page)
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single()

        const currentCredits = (profile as any)?.credits || 0
        const requiredCredits = timeSlots?.length || 0


        // 3. Prepare text for embedding
        const subjectText = Array.isArray(subjects)
            ? subjects.map((s: any) => `${s?.name || ''}: ${s?.predicted_grade || ''}`).filter(Boolean).join(', ')
            : ''

        const targetsText = Array.isArray(targetUniversities) ? targetUniversities.join(', ') : ''

        const availabilityText = Array.isArray(timeSlots)
            ? timeSlots
                .map((s: any) => {
                    // Preferred/legacy format: ISO strings
                    if (s?.startTime && typeof s.startTime === 'string' && s.startTime.includes('T')) {
                        const start = new Date(s.startTime)
                        const end = new Date(s.endTime)
                        const dateStr = isNaN(start.getTime()) ? (s?.date || '') : start.toISOString().slice(0, 10)
                        const startStr = isNaN(start.getTime()) ? (s?.startTime || '') : start.toISOString()
                        const endStr = isNaN(end.getTime()) ? (s?.endTime || '') : end.toISOString()
                        return `${dateStr} ${startStr} - ${endStr}`
                    }

                    // Weekly-style format (fallback)
                    if (s?.day) {
                        return `${s?.day || ''} ${s?.startTime || ''}-${s?.endTime || ''}`.trim()
                    }

                    return `${s?.date || ''} ${s?.startTime || ''}-${s?.endTime || ''}`.trim()
                })
                .filter(Boolean)
                .join('; ')
            : ''

        const studentProfileText = `
Student onboarding:
School: ${schoolName || ''} (${schoolCountry || ''})
Curriculum: ${curriculum || ''}${curriculum === 'Other' ? ` - ${curriculumOther || ''}` : ''}
Subjects & predicted grades: ${subjectText}
Target universities: ${targetsText}
Timezone: ${timezone || ''}
Weekly availability: ${availabilityText}
Academic interests: ${academicInterests || ''}
Extracurriculars: ${extracurriculars || ''}
Anything else: ${anythingElse || ''}

Legacy fields (if provided):
Strengths: ${strengths || ''}
Weaknesses: ${weaknesses || ''}
Mentor requirements: ${requirements || ''}
        `.trim()

        // 3. Generate Embedding
        const openai = new OpenAI({
            apiKey: process.env.OPEN_AI_API_KEY,
        })

        let embedding
        try {
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: studentProfileText,
            })
            embedding = embeddingResponse.data[0].embedding
        } catch (openaiErr: any) {
            console.error('OpenAI Embedding Error:', openaiErr)
            return NextResponse.json({ error: 'Failed to process your profile for matching. Please try again later.' }, { status: 503 })
        }

        // 4. Search for top mentors via RPC (hard-capped to 5)
        const { data: matches, error: matchError } = await supabase.rpc('match_mentors', {
            query_embedding: `[${embedding.join(',')}]`,
            match_threshold: 0.1, // Lowered threshold slightly to ensure matches
            match_count: 5,
        })

        console.log('\n\nMatches:\n', JSON.stringify(matches, null, 2), '\n\n')
        console.log('\n\nMatch Error:\n', JSON.stringify(matchError, null, 2), '\n\n')

        if (matchError) {
            console.error('Match RPC Error:', matchError)
            return NextResponse.json({ error: 'Database error while matching mentors. Please try again.' }, { status: 500 })
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json({ error: 'No suitable mentors found at this time.' }, { status: 404 })
        }

        // Defensive cap in case RPC returns more than requested.
        const topMatches = matches.slice(0, 5)

        // 5. Create mentorship requests
        const requests = topMatches.map((mentor: any) => ({
            student_id: user.id,
            mentor_id: mentor.id,
            responses: {
                schoolName,
                schoolCountry,
                curriculum,
                curriculumOther,
                subjects,
                targetUniversities,
                timezone,
                timeSlots,
                academicInterests,
                extracurriculars,
                anythingElse,
                // legacy
                strengths,
                weaknesses,
                requirements
            },
            status: 'pending'
        }))

        const { error: insertError } = await supabase
            .from('mentorship_requests')
            .insert(requests)

        if (insertError) throw insertError

        // 5b. Upsert student_profiles so we have school info and parent_email for fortnightly reports
        const targetUniversity = Array.isArray(targetUniversities) && targetUniversities.length > 0 ? targetUniversities[0] : null
        await supabase
            .from('student_profiles')
            .upsert({
                id: user.id,
                school_name: schoolName || null,
                school_country: schoolCountry || null,
                curriculum: curriculum || null,
                curriculum_other: curriculumOther || null,
                target_university: targetUniversity,
                subjects: Array.isArray(subjects) ? subjects : [],
                interests: academicInterests || null,
                extracurriculars: extracurriculars || null,
                additional_notes: anythingElse || null,
                timezone: timezone || null,
                parent_email: parentEmail && String(parentEmail).trim() ? String(parentEmail).trim() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

        // 6. Create notifications for mentors
        // We fetch emails from profiles (previously synced)
        const mentorIds = topMatches.map((m: any) => m.id)
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

        // 7. Deduct credits from user (REMOVED - moved to sessions page)
        // const newBalance = currentCredits - requiredCredits
        // const { error: creditUpdateError } = await supabase
        //     .from('profiles')
        //     .update({ credits: newBalance })
        //     .eq('id', user.id)

        // if (creditUpdateError) {
        //     console.error('Failed to deduct credits:', creditUpdateError)
        // }

        // 8. Create transaction record for audit (REMOVED - moved to sessions page)
        /*
        await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: -requiredCredits,
            balance_after: newBalance,
            type: 'booking',
            description: `Booked ${requiredCredits} mentorship session${requiredCredits > 1 ? 's' : ''} with ${matches.length} mentor${matches.length > 1 ? 's' : ''}`
        })
        */

        return NextResponse.json({
            success: true,
            count: topMatches.length
        })

    } catch (error: any) {
        console.error('Match API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
