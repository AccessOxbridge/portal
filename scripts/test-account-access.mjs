// Integration checks against the isolated Docker stack, never production.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

process.loadEnvFile('.env.local')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
assert.equal(
    url,
    'http://127.0.0.1:54321',
    'This script only runs against the local Docker database',
)
const app = 'http://localhost:3200'
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
})
const fixturePassword = `${randomUUID()}Aa1!`
const users = []
let passed = 0
const check = (name, value) => {
    assert.ok(value, name)
    console.log(`PASS ${name}`)
    passed++
}
const must = (result) => {
    if (result.error) throw result.error
    return result.data
}

async function login(email, password) {
    const jar = new Map()
    const db = createServerClient(url, key, {
        cookies: {
            getAll: () => [...jar].map(([name, value]) => ({ name, value })),
            setAll: (cookies) =>
                cookies.forEach(({ name, value }) => jar.set(name, value)),
        },
    })
    const session = must(await db.auth.signInWithPassword({ email, password }))
    const cookie = [...jar]
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
    return {
        id: session.user.id,
        db,
        request: (path, init = {}) =>
            fetch(app + path, {
                ...init,
                redirect: 'manual',
                headers: { cookie, ...init.headers },
            }),
    }
}

async function fixture(role) {
    const email = `access-${role}-${randomUUID()}@test.local`
    const { user } = must(
        await service.auth.admin.createUser({
            email,
            password: fixturePassword,
            email_confirm: true,
            user_metadata: {
                full_name: `Alex ${role}`,
                role: role === 'mentor' ? 'mentor' : 'student',
            },
        }),
    )
    users.push(user.id)
    must(await service.from('profiles').update({ role }).eq('id', user.id))
    return login(email, fixturePassword)
}

async function snapshot() {
    const result = {}
    for (const table of [
        'profiles',
        'sessions',
        'messages',
        'credit_transactions',
        'mentor_invoices',
        'mentor_payouts',
    ]) {
        const { count, error } = await service
            .from(table)
            .select('id', { count: 'exact', head: true })
        if (error) throw error
        result[table] = count
    }
    return result
}

const before = await snapshot()
try {
    const admin = await fixture('admin')
    const student = await fixture('student')
    const parent = await fixture('parent')
    const mentor = await fixture('mentor')
    const secondAdmin = await fixture('admin-dev')
    const disable = (user) =>
        admin.db.rpc('admin_set_account_enabled', {
            p_user_id: user.id,
            p_enabled: false,
        })
    const enable = (user) =>
        admin.db.rpc('admin_set_account_enabled', {
            p_user_id: user.id,
            p_enabled: true,
        })

    check(
        'student cannot disable an account',
        !!(
            await student.db.rpc('admin_set_account_enabled', {
                p_user_id: parent.id,
                p_enabled: false,
            })
        ).error,
    )
    check(
        'administrator cannot disable their own account',
        !!(await disable(admin)).error,
    )
    check(
        'direct account-state writes are rejected',
        !!(
            await student.db.from('account_access').insert({
                user_id: student.id,
                changed_by: student.id,
                disabled_at: new Date().toISOString(),
            })
        ).error,
    )
    check(
        'admin management page renders',
        (await admin.request('/dashboard/admin/disable-account')).status ===
            200,
    )

    for (const person of [student, parent, mentor, secondAdmin]) {
        must(await disable(person))
        check(
            'disabled account can read its own status',
            !!must(
                await person.db
                    .from('account_access')
                    .select('disabled_at')
                    .eq('user_id', person.id)
                    .single(),
            ).disabled_at,
        )
        const denied = await person.request('/dashboard')
        check(
            'existing session redirects to disabled screen',
            denied.status === 307 &&
                denied.headers.get('location')?.endsWith('/account-disabled'),
        )
        const page = await person.request('/account-disabled')
        const text = await page.text()
        check(
            'disabled screen contains message and email link',
            page.status === 200 &&
                text.includes('Your account has been disabled.') &&
                text.includes('mailto:office@accessoxbridge.io'),
        )
        check(
            'existing session cannot call authenticated API',
            (
                await person.request('/api/stripe/checkout', {
                    method: 'POST',
                    body: '{}',
                })
            ).status === 403,
        )
        const direct = must(await person.db.from('profiles').select('id'))
        check(
            'existing JWT cannot read profile rows directly',
            direct.length === 0,
        )
        for (const view of [
            'profiles_private',
            'mentors_private',
            'mentors_directory',
        ]) {
            const result = await person.db.from(view).select('id')
            check(
                `disabled JWT cannot read ${view}`,
                !result.error && result.data.length === 0,
            )
        }
        check(
            'existing JWT cannot update a profile directly',
            !!(
                await person.db
                    .from('profiles')
                    .update({ full_name: 'Should not save' })
                    .eq('id', person.id)
            ).error,
        )
        must(await enable(person))
        check(
            're-enabled account leaves disabled screen',
            (await person.request('/account-disabled')).headers
                .get('location')
                ?.endsWith('/dashboard'),
        )
        check(
            're-enabled JWT can read its own profile',
            must(
                await person.db
                    .from('profiles')
                    .select('id')
                    .eq('id', person.id),
            ).length === 1,
        )
    }

    const invoice = must(
        await service
            .from('mentor_invoices')
            .insert({ mentor_id: mentor.id, status: 'draft' })
            .select('id')
            .single(),
    )
    check(
        'draft invoice blocks mentor disabling',
        (await disable(mentor)).error?.message.includes('outstanding invoice'),
    )
    must(
        await service
            .from('mentor_invoices')
            .update({ status: 'submitted' })
            .eq('id', invoice.id),
    )
    check(
        'submitted invoice blocks mentor disabling',
        !!(await disable(mentor)).error,
    )
    must(
        await service
            .from('mentor_invoices')
            .update({ status: 'paid' })
            .eq('id', invoice.id),
    )
    must(await disable(mentor))
    check(
        'paid invoice remains readable by admin',
        must(
            await service
                .from('mentor_invoices')
                .select('id, status')
                .eq('id', invoice.id)
                .single(),
        ).status === 'paid',
    )
    must(await enable(mentor))

    const payout = must(
        await service
            .from('mentor_payouts')
            .insert({
                mentor_id: mentor.id,
                period_start: '2026-10-01',
                period_end: '2026-10-14',
                status: 'pending',
            })
            .select('id')
            .single(),
    )
    for (const status of ['pending', 'processing', 'failed']) {
        must(
            await service
                .from('mentor_payouts')
                .update({ status })
                .eq('id', payout.id),
        )
        check(
            `${status} payout blocks mentor disabling`,
            (await disable(mentor)).error?.message.includes(
                'unresolved payout',
            ),
        )
    }
    must(
        await service
            .from('mentor_payouts')
            .update({ status: 'paid' })
            .eq('id', payout.id),
    )

    const session = must(
        await service
            .from('sessions')
            .insert({
                student_id: student.id,
                mentor_id: mentor.id,
                status: 'completed',
                actual_minutes: 60,
                scheduled_at: '2026-10-01T10:00:00Z',
            })
            .select('id')
            .single(),
    )
    check(
        'unbilled completed session blocks disabling',
        (await disable(mentor)).error?.message.includes('unbilled session'),
    )
    must(
        await service
            .from('sessions')
            .update({ actual_minutes: 10 })
            .eq('id', session.id),
    )
    must(await disable(mentor))
    check('short non-billable session does not block disabling', true)
    check(
        'new session cannot target a disabled mentor',
        !!(
            await service
                .from('sessions')
                .insert({ student_id: student.id, mentor_id: mentor.id })
        ).error,
    )
    check(
        'new assignment cannot target a disabled mentor',
        !!(
            await service.from('student_mentor_assignments').insert({
                student_id: student.id,
                mentor_id: mentor.id,
                assigned_by: admin.id,
                is_current: true,
            })
        ).error,
    )
    check(
        'new request cannot target a disabled mentor',
        !!(
            await service.from('mentorship_requests').insert({
                student_id: student.id,
                mentor_id: mentor.id,
                responses: {},
            })
        ).error,
    )
    check(
        'historical session remains available',
        must(await service.from('sessions').select('id').eq('id', session.id))
            .length === 1,
    )
    must(await enable(mentor))
    const profileBefore = must(
        await service.from('profiles').select('*').in('id', users).order('id'),
    )
    must(await disable(student))
    must(await disable(student))
    must(await enable(student))
    check(
        'disable and re-enable do not alter profile data',
        JSON.stringify(profileBefore) ===
            JSON.stringify(
                must(
                    await service
                        .from('profiles')
                        .select('*')
                        .in('id', users)
                        .order('id'),
                ),
            ),
    )
    check(
        'audit events are recorded',
        must(
            await admin.db
                .from('account_access_events')
                .select('id')
                .in('user_id', users),
        ).length > 0,
    )
    check(
        'ordinary users cannot read audit events',
        must(await student.db.from('account_access_events').select('id'))
            .length === 0,
    )

    const seed = JSON.parse(
        readFileSync(
            process.env.LOCAL_TEST_SEED_FILE ||
                '.ai-context/local-test/seed-users.json',
            'utf8',
        ),
    )
    const seedParent = await login('parent1@test.local', seed.password)
    const memberships = await seedParent.request('/dashboard/parent/programmes')
    const html = await memberships.text()
    check(
        'membership page renders approved names and prices',
        memberships.status === 200 &&
            [
                'Oxbridge Lite',
                'Oxbridge Excel',
                'Oxbridge Concierge',
                '£247',
                '£397',
                '£1,250',
                '£3,970',
            ].every((value) => html.includes(value)),
    )
    check(
        'membership page has no draft badge or checkout request',
        !html.includes('Draft · details') &&
            html.includes('Online enrolment opens soon'),
    )
    const anon = createClient(url, key, { auth: { persistSession: false } })
    check(
        'existing public mentor-directory access still works',
        !(await anon.from('mentors_directory').select('id')).error,
    )
    const seedAdmin = await login('admin@test.local', seed.password)
    for (const route of [
        '/dashboard/admin',
        '/dashboard/admin/parents',
        '/dashboard/admin/approvals',
        '/dashboard/admin/performance',
        '/dashboard/admin/manage-sessions',
        '/dashboard/admin/fortnightly-report',
        '/dashboard/admin/session-payouts',
        '/dashboard/admin/transactions',
    ]) {
        const response = await seedAdmin.request(route)
        const content = await response.text()
        check(
            `enabled admin regression: ${route}`,
            response.status === 200 &&
                !content.includes('NEXT_HTTP_ERROR_FALLBACK'),
        )
    }
    for (const [email, route] of [
        ['student1@test.local', '/dashboard/student'],
        ['mentor1@test.local', '/dashboard/mentor'],
        ['parent1@test.local', '/dashboard/parent'],
    ]) {
        const person = await login(email, seed.password)
        const response = await person.request(route)
        check(`enabled role regression: ${route}`, response.status === 200)
    }
    const concurrent = await Promise.all([
        admin.db.rpc('admin_set_account_enabled', {
            p_user_id: secondAdmin.id,
            p_enabled: false,
        }),
        secondAdmin.db.rpc('admin_set_account_enabled', {
            p_user_id: admin.id,
            p_enabled: false,
        }),
    ])
    check(
        'concurrent admins cannot disable each other and leave no enabled admin',
        concurrent.filter((result) => !result.error).length === 1,
    )
} finally {
    // Remove only the users created by this run, always on the asserted local URL.
    if (users.length) {
        must(
            await service
                .from('account_access_events')
                .delete()
                .in('user_id', users),
        )
        must(await service.from('account_access').delete().in('user_id', users))
        must(await service.from('sessions').delete().in('mentor_id', users))
        must(
            await service
                .from('mentor_invoices')
                .delete()
                .in('mentor_id', users),
        )
        must(
            await service
                .from('mentor_payouts')
                .delete()
                .in('mentor_id', users),
        )
        for (const id of users) must(await service.auth.admin.deleteUser(id))
    }
    assert.deepEqual(
        await snapshot(),
        before,
        'Existing row counts must be restored after fixture cleanup',
    )
}
console.log(`All ${passed} account-access checks passed; fixture rows removed.`)
