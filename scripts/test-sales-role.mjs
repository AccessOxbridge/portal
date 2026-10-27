// Integration checks against the isolated Docker stack, never production.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

process.loadEnvFile('.env.local')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
assert.equal(url, 'http://127.0.0.1:54321', 'This script only runs against the local Docker database')

const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
})
const password = `${randomUUID()}Aa1!`
const users = []
let passed = 0

function must(result) {
    if (result.error) throw result.error
    return result.data
}

function check(name, condition) {
    assert.ok(condition, name)
    console.log(`PASS ${name}`)
    passed++
}

async function fixture(role) {
    const email = `sales-role-${role}-${randomUUID()}@test.local`
    const { user } = must(await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Alex ${role}` },
        app_metadata: { role },
    }))
    users.push(user.id)
    must(await service.from('profiles').update({ role }).eq('id', user.id))

    const jar = new Map()
    const db = createServerClient(url, key, {
        cookies: {
            getAll: () => [...jar].map(([name, value]) => ({ name, value })),
            setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
        },
    })
    must(await db.auth.signInWithPassword({ email, password }))
    const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
    return { id: user.id, email, db, cookie }
}

async function snapshot() {
    const result = {}
    for (const table of ['profiles', 'parent_profiles', 'account_access', 'account_access_events']) {
        const { count, error } = await service.from(table).select('*', { count: 'exact', head: true })
        if (error) throw error
        result[table] = count
    }
    return result
}

const before = await snapshot()
try {
    const admin = await fixture('admin')
    const sales = await fixture('sales')
    const parent = await fixture('parent')
    const student = await fixture('student')

    check(
        'sales cannot read the parent profile directly',
        must(await sales.db.from('profiles').select('id').eq('id', parent.id)).length === 0,
    )
    check(
        'sales cannot read parent private details directly',
        must(await sales.db.from('profiles_private').select('id').eq('id', parent.id)).length === 0,
    )

    must(await sales.db.rpc('admin_set_account_enabled', { p_user_id: parent.id, p_enabled: false }))
    check(
        'sales can disable a parent account',
        !!must(await service.from('account_access').select('disabled_at').eq('user_id', parent.id).single()).disabled_at,
    )
    must(await sales.db.rpc('admin_set_account_enabled', { p_user_id: parent.id, p_enabled: true }))
    check(
        'sales can re-enable a parent account',
        must(await service.from('account_access').select('disabled_at').eq('user_id', parent.id).single()).disabled_at === null,
    )
    check(
        'sales cannot disable a student account',
        !!(await sales.db.rpc('admin_set_account_enabled', { p_user_id: student.id, p_enabled: false })).error,
    )
    check(
        'sales cannot disable an administrator account',
        !!(await sales.db.rpc('admin_set_account_enabled', { p_user_id: admin.id, p_enabled: false })).error,
    )
    check(
        'ordinary users cannot disable a parent account',
        !!(await student.db.rpc('admin_set_account_enabled', { p_user_id: parent.id, p_enabled: false })).error,
    )
    must(await admin.db.rpc('admin_set_account_enabled', { p_user_id: sales.id, p_enabled: false }))
    check(
        'administrators can disable sales accounts',
        !!must(await service.from('account_access').select('disabled_at').eq('user_id', sales.id).single()).disabled_at,
    )
    check(
        'disabled sales accounts cannot change parent access',
        !!(await sales.db.rpc('admin_set_account_enabled', { p_user_id: parent.id, p_enabled: false })).error,
    )
    must(await admin.db.rpc('admin_set_account_enabled', { p_user_id: sales.id, p_enabled: true }))

    const audit = must(
        await service
            .from('account_access_events')
            .select('actor_id, user_id, enabled')
            .eq('actor_id', sales.id)
            .eq('user_id', parent.id),
    )
    check('sales access changes are audited', audit.length === 2)

    const app = process.env.LOCAL_TEST_APP_URL
    if (app) {
        const request = (path) => fetch(app + path, { redirect: 'manual', headers: { cookie: sales.cookie } })
        const landing = await request('/dashboard')
        const landingHtml = await landing.text()
        check(
            'sales dashboard redirects to parent accounts',
            landing.headers.get('location')?.endsWith('/dashboard/sales/parents') ||
                landingHtml.includes('/dashboard/sales/parents'),
        )

        const parentsPage = await request('/dashboard/sales/parents')
        const parentsHtml = await parentsPage.text()
        check(
            'sales parent-account page renders only the focused creation flow',
            parentsPage.status === 200 &&
                parentsHtml.includes('Create parent account') &&
                !parentsHtml.includes('Link to student'),
        )

        const disablePage = await request('/dashboard/sales/disable-account')
        const disableHtml = await disablePage.text()
        check(
            'sales disable page is limited to parents',
            disablePage.status === 200 &&
                disableHtml.includes('Parents') &&
                !disableHtml.includes('Students') &&
                !disableHtml.includes('Mentors') &&
                !disableHtml.includes('Admins'),
        )

        const adminPage = await request('/dashboard/admin')
        const adminHtml = await adminPage.text()
        check(
            'sales cannot open the admin area',
            (adminPage.status === 307 && adminPage.headers.get('location')?.endsWith('/dashboard')) ||
                adminHtml.includes('NEXT_REDIRECT') && adminHtml.includes('/dashboard'),
        )
    }
} finally {
    if (users.length) {
        must(await service.from('account_access_events').delete().or(`user_id.in.(${users.join(',')}),actor_id.in.(${users.join(',')})`))
        must(await service.from('account_access').delete().in('user_id', users))
        for (const id of users) must(await service.auth.admin.deleteUser(id))
    }
    assert.deepEqual(await snapshot(), before, 'Fixture cleanup must restore local row counts')
}

console.log(`All ${passed} sales-role checks passed; fixture rows removed.`)
