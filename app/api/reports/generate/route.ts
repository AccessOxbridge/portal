import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OpenAI from 'openai'
import { PERSONALIZED_REPORT_PROMPT, PLACEHOLDER_SUMMARY } from '@/config/prompts.config'

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json()
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }

        const supabase = await createClient()
        const adminSupabase = createAdminClient()
        const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure only the assigned mentor can trigger report generation.
        const { data: sessionOwner } = await supabase
            .from('sessions')
            .select('id, mentor_id')
            .eq('id', sessionId)
            .single()

        if (!sessionOwner || sessionOwner.mentor_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 1. Fetch AI-generated summary from session_reports
        const { data: report } = await adminSupabase
            .from('session_reports')
            .select('*')
            .eq('session_id', sessionId)
            .single()

        // 2. Fetch mentor's form response
        const { data: mentorResponse } = await supabase
            .from('form_responses')
            .select('responses')
            .eq('session_id', sessionId)
            .eq('form_type', 'mentor_report')
            .eq('respondent_id', user.id)
            .single()

        if (!mentorResponse) {
            return NextResponse.json({ error: 'Mentor report not found' }, { status: 404 })
        }

        const mentorData = mentorResponse.responses as Record<string, any>

        // 3. Build a strict, source-of-truth prompt using only mentor-provided fields.
        //    IMPORTANT: instruct the model NOT to invent information. If a field is missing,
        //    the model should explicitly say "Not provided" or omit that section.
        const safePrompt = [
            "You are an expert education consultant. ONLY use the information provided below. Do NOT invent facts, make assumptions, or add any details that are not present in the inputs.",
            "",
            "AI-generated session summary:",
            report?.summary || PLACEHOLDER_SUMMARY,
            "",
            "AI-extracted key points (JSON array):",
            JSON.stringify(report?.key_points || []),
            "",
            "MENTOR'S FORM RESPONSES (use these as the authoritative source):",
            `Overall rating: ${String(mentorData.overall_rating || 'Not provided')}`,
            `Student engagement: ${String(mentorData.student_engagement || 'Not provided')}`,
            `Topics covered: ${String(mentorData.topics_covered || 'Not provided')}`,
            `Areas of improvement: ${String(mentorData.areas_of_improvement || 'Not provided')}`,
            `Recommended next steps: ${String(mentorData.next_steps || 'Not provided')}`,
            `Mentor notes: ${String(mentorData.additional_notes || 'Not provided')}`,
            "",
            "TASK:",
            "Create a single personalized session report for the student that:",
            "1) Begins with brief positive encouragement.",
            "2) Summarizes what was accomplished based ONLY on the mentor's responses and the AI summary above.",
            "3) Lists clear areas to work on (from mentor input). If none provided, write 'Not provided'.",
            "4) Gives 3 concise, actionable next steps drawn from the mentor's recommendations (or say 'Not provided').",
            "5) Ends with a short motivational closing.",
            "",
            "Tone: warm, supportive, professional. Keep it factual and avoid generic filler. Do not add any new claims or extrapolations beyond the inputs.",
            "Output: plain text, max 400 words."
        ].join("\n\n")

        // 4. Generate personalized report (use deterministic temperature to avoid hallucination)
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert education consultant.' },
                { role: 'user', content: safePrompt }
            ],
            temperature: 0.0
        })

        const personalizedReport = completion.choices[0].message.content

        // 5. Save to session_reports
        if (report) {
            await adminSupabase
                .from('session_reports')
                .update({
                    personalized_report: personalizedReport,
                    personalized_report_generated_at: new Date().toISOString()
                })
                .eq('session_id', sessionId)
        } else {
            // Create new report if AI summary wasn't generated
            await adminSupabase.from('session_reports').insert({
                session_id: sessionId,
                personalized_report: personalizedReport,
                personalized_report_generated_at: new Date().toISOString()
            })
        }

        // 6. Notify student that their report is ready
        const { data: session } = await adminSupabase
            .from('sessions')
            .select('student_id')
            .eq('id', sessionId)
            .single()

        if (session) {
            await adminSupabase.from('notifications').insert({
                recipient_id: session.student_id,
                recipient_email: '',
                type: 'session_confirmed',
                title: '📊 Your Session Report is Ready!',
                message: 'Your personalized session report has been generated. Check it out!',
                data: { session_id: sessionId, action: 'view_report' }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[REPORT GENERATION] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
