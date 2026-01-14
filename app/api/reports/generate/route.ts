import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { PERSONALIZED_REPORT_PROMPT, PLACEHOLDER_SUMMARY } from '@/config/prompts.config'

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json()
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }

        const supabase = await createClient()
        const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY })

        // 1. Fetch AI-generated summary from session_reports
        const { data: report } = await supabase
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
            .single()

        if (!mentorResponse) {
            return NextResponse.json({ error: 'Mentor report not found' }, { status: 404 })
        }

        const mentorData = mentorResponse.responses as Record<string, any>

        // 3. Build the prompt with placeholders replaced
        let prompt = PERSONALIZED_REPORT_PROMPT
            .replace('{{summary}}', report?.summary || PLACEHOLDER_SUMMARY)
            .replace('{{key_points}}', JSON.stringify(report?.key_points || []))
            .replace('{{overall_rating}}', String(mentorData.overall_rating || 'N/A'))
            .replace('{{student_engagement}}', String(mentorData.student_engagement || 'N/A'))
            .replace('{{topics_covered}}', String(mentorData.topics_covered || 'Not provided'))
            .replace('{{areas_of_improvement}}', String(mentorData.areas_of_improvement || 'Not provided'))
            .replace('{{next_steps}}', String(mentorData.next_steps || 'Not provided'))
            .replace('{{mentor_notes}}', String(mentorData.additional_notes || 'None'))

        // 4. Generate personalized report
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert education consultant.' },
                { role: 'user', content: prompt }
            ]
        })

        const personalizedReport = completion.choices[0].message.content

        // 5. Save to session_reports
        if (report) {
            await supabase
                .from('session_reports')
                .update({
                    personalized_report: personalizedReport,
                    personalized_report_generated_at: new Date().toISOString()
                })
                .eq('session_id', sessionId)
        } else {
            // Create new report if AI summary wasn't generated
            await supabase.from('session_reports').insert({
                session_id: sessionId,
                personalized_report: personalizedReport,
                personalized_report_generated_at: new Date().toISOString()
            })
        }

        // 6. Notify student that their report is ready
        const { data: session } = await supabase
            .from('sessions')
            .select('student_id')
            .eq('id', sessionId)
            .single()

        if (session) {
            await supabase.from('notifications').insert({
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
