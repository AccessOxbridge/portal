import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ParentsClient, type MissingAccount, type ParentRow, type StudentOption, type Suggestion } from './parents-client'

/**
 * /dashboard/admin/parents: create parent accounts (before or after the
 * student exists), link and unlink them, and see suggested links where a
 * student's saved parent email matches. Reads use the admin's own
 * RLS-respecting client; writes go through ./actions.
 */
export default async function AdminParentsPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!me || (me.role !== 'admin' && me.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    const [{ data: parents }, { data: details }, { data: links }, { data: students }, { data: academic }, { data: infos }, { data: docs }] = await Promise.all([
        supabase.from('profiles_private').select('id, full_name, email, updated_at').eq('role', 'parent').order('updated_at', { ascending: false }),
        supabase.from('parent_profiles').select('id, child_first_name'),
        supabase.from('parent_student_links').select('parent_id, student_id, created_at').is('revoked_at', null),
        supabase.from('profiles_private').select('id, full_name, email').eq('role', 'student').order('full_name'),
        supabase.from('student_profiles').select('id, parent_email').not('parent_email', 'is', null),
        supabase.from('parent_student_info').select('*'),
        supabase.from('parent_documents').select('id, parent_id, file_name, mime_type, size_bytes, created_at').order('created_at', { ascending: false }),
    ])

    const infoOf = new Map((infos || []).map((i) => [i.parent_id, i]))
    const docsOf = new Map<string, ParentRow['documents']>()
    for (const d of docs || []) {
        const list = docsOf.get(d.parent_id) ?? []
        list.push({ id: d.id, fileName: d.file_name, mimeType: d.mime_type, sizeBytes: d.size_bytes, createdAt: d.created_at })
        docsOf.set(d.parent_id, list)
    }

    const childNameOf = new Map((details || []).map((d) => [d.id, d.child_first_name]))
    const linkOfParent = new Map((links || []).map((l) => [l.parent_id, l]))
    const parentOfStudent = new Map((links || []).map((l) => [l.student_id, l.parent_id]))
    const studentName = new Map((students || []).map((s) => [s.id as string, s.full_name || s.email || 'Student']))
    const parentEmailOf = new Map(
        (academic || [])
            .map((a) => [a.id, (a.parent_email || '').trim().toLowerCase()] as const)
            .filter(([, email]) => email.length > 0)
    )

    const rows: ParentRow[] = (parents || []).map((p) => {
        const link = linkOfParent.get(p.id as string)
        const info = infoOf.get(p.id as string)
        return {
            id: p.id as string,
            name: p.full_name || 'Parent',
            email: p.email || '',
            childFirstName: childNameOf.get(p.id as string) ?? null,
            studentInfo: info
                ? {
                      childFirstName: info.child_first_name,
                      childLastName: info.child_last_name ?? '',
                      school: info.school ?? '',
                      yearGroup: info.year_group ?? '',
                      subjects: info.subjects ?? '',
                      courseInterest: info.course_interest ?? '',
                      universityPreference: info.university_preference ?? '',
                      notes: info.notes ?? '',
                      submittedAt: info.updated_at,
                  }
                : null,
            documents: docsOf.get(p.id as string) ?? [],
            link: link
                ? { studentId: link.student_id, studentName: studentName.get(link.student_id) || 'Student', since: link.created_at }
                : null,
        }
    })

    const studentOptions: StudentOption[] = (students || []).map((s) => ({
        id: s.id as string,
        name: s.full_name || s.email || 'Student',
        email: s.email || '',
        linked: parentOfStudent.has(s.id as string),
        parentEmail: parentEmailOf.get(s.id as string) ?? null,
    }))

    // A student's saved parent email that matches an unlinked parent account:
    // suggested, never linked automatically. One with no account yet: offered
    // as a prefilled "create".
    const parentByEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]))
    const suggestions: Suggestion[] = []
    const missing: MissingAccount[] = []
    for (const s of studentOptions) {
        if (s.linked || !s.parentEmail) continue
        const parent = parentByEmail.get(s.parentEmail)
        if (parent && !parent.link) {
            suggestions.push({ parentId: parent.id, parentName: parent.name, parentEmail: parent.email, studentId: s.id, studentName: s.name })
        } else if (!parent) {
            missing.push({ studentId: s.id, studentName: s.name, parentEmail: s.parentEmail })
        }
    }

    return <ParentsClient parents={rows} students={studentOptions} suggestions={suggestions} missing={missing} />
}
