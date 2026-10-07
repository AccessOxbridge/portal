// Screenshot capture for the student portal guide.
// Opens a visible browser; a person signs in themselves (never script a
// password: logins go to the production Supabase project). The script then
// only navigates and opens modals, never clicks Send / Save / Submit, and
// aborts every non-GET request as a second line of defence.
const { createRequire } = require('module')
const path = require('path')
const req = createRequire(__filename)
const { chromium } = req('playwright')

const BASE = 'http://localhost:3000'
const OUT = path.join(__dirname, 'shots')
const PROFILE = path.join(__dirname, 'profile')
const only = process.argv.slice(2)

async function tidy(page) {
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
    // Display-only sample data: the test account's mentor and student share a
    // name and have placeholder content. Nothing here is saved anywhere.
    await page.evaluate(() => {
        const STUDENT = 'Alex Morgan'
        const MENTOR = 'Dr Emily Carter'
        const exact = {
            'You: d': 'You: Thanks, see you on Thursday!',
            'sup': 'Welcome to your group chat!',
            'd': 'Thanks, see you on Thursday!',
            'Ancient Greek': 'Computer Science',
            'Architecture': 'Mathematics',
            'Archaeology and Anthropology': 'Personal Statements',
            'Archaeology': 'Interview Practice',
            '+48 more': '+2 more',
            'A brief bio about yourself': 'Cambridge Computer Science graduate. I help students with personal statements, admissions tests and interview practice.',
        }
        const isStudentSpot = (el) =>
            !!el.closest('aside button') ||
            !!el.closest('[data-guide-student]') ||
            (el.parentElement && /^Name/.test(el.parentElement.textContent.trim()) && el.parentElement.children.length <= 3)
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        const nodes = []
        let n
        while ((n = walker.nextNode())) nodes.push(n)
        for (const t of nodes) {
            let v = t.nodeValue
            const trimmed = v.trim()
            if (exact[trimmed]) { t.nodeValue = exact[trimmed]; continue }
            v = v.replace(/\s*\[(STUDENT|MENTOR|TEST)\]/gi, '')
            v = v.replace(/rajvishwakarma0221@gmail\.com/g, 'alex.morgan@example.com')
            v = v.replace(/Utsav Atri/g, 'Claire Marlowe')
            v = v.replace(/Welcome back, Raj Vishwakarma/g, 'Welcome back, Alex')
            v = v.replace(/Welcome, Raj Vishwakarma/g, 'Welcome, Alex')
            if (/gfds/.test(v)) {
                v = 'In this session, we worked through two practice interview questions and talked about how to structure your personal statement. You explained your thinking clearly and asked good questions throughout.'
            }
            if (v.includes('Raj Vishwakarma') && /Welcome/.test(t.parentElement?.textContent || '')) {
                v = v.replace(/Raj Vishwakarma/g, 'Alex')
            }
            if (v.includes('Raj Vishwakarma')) {
                v = v.replace(/Raj Vishwakarma/g, isStudentSpot(t.parentElement) ? STUDENT : MENTOR)
            }
            if (v !== t.nodeValue) t.nodeValue = v
        }
        const avatar = (initials, bg) =>
            'data:image/svg+xml;utf8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#fff">${initials}</text></svg>`)
        for (const img of document.querySelectorAll('img')) {
            const src = img.getAttribute('src') || ''
            if (src.includes('logo')) continue
            const studentImg = !!img.closest('aside button') || !!img.closest('section')?.textContent.includes('Profile photo')
            img.src = studentImg ? avatar('AM', '#4f868e') : avatar('EC', '#092c68')
            img.srcset = ''
        }
    })
    await page.waitForTimeout(400)
}

async function go(page, url) {
    await page.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1500)
}

async function shot(page, name, opts = {}) {
    await tidy(page)
    await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts })
    console.log('saved', name)
}

const steps = {
    async home(page) {
        await go(page, '/dashboard/student')
        await shot(page, 'home')
    },
    async homeLower(page) {
        await go(page, '/dashboard/student')
        await page.evaluate(() => {
            for (const el of document.querySelectorAll('*')) {
                const s = getComputedStyle(el)
                if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 50) el.scrollTop = 520
            }
            window.scrollTo(0, 520)
        })
        await page.waitForTimeout(600)
        await shot(page, 'home-full')
    },
    async profile(page) {
        await go(page, '/dashboard/student/profile')
        await shot(page, 'profile')
    },
    async mentors(page) {
        await go(page, '/dashboard/student/mentors')
        await shot(page, 'mentors')
    },
    async messages(page) {
        await go(page, '/dashboard/student/messages')
        await page.waitForTimeout(1500)
        // Open the mentor chat (0 unread incoming, so no read-state change),
        // then show a sample thread in place of the test messages.
        await page.getByText('You: d', { exact: true }).first().click()
        await page.waitForTimeout(2000)
        await page.evaluate(() => {
            const pane = document.querySelector('div.h-full.overflow-y-auto')
            if (!pane) return
            const sep = (label) => `<div class="flex items-center gap-3 py-3"><span class="flex-1 h-px bg-gray-200/70"></span><span class="text-[11px] font-medium text-gray-400 tracking-wide">${label}</span><span class="flex-1 h-px bg-gray-200/70"></span></div>`
            const inc = (time, lines) => `<div class="flex gap-2.5 mb-3"><div class="w-8 shrink-0"><div class="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold">EC</div></div><div class="min-w-0 max-w-[85%]"><div class="flex items-baseline gap-2 mb-1"><span class="text-[13px] font-semibold text-gray-900">Dr Emily Carter</span><span class="text-[11px] text-gray-400 tabular-nums">${time}</span></div>${lines.map((l) => `<div class="text-gray-700 mb-1.5">${l}</div>`).join('')}</div></div>`
            const out = (time, lines) => `<div class="flex flex-col items-end mb-3">${lines.map((l, i) => `<div class="max-w-[70%] px-3.5 py-2.5 rounded-2xl bg-accent text-white ${i === lines.length - 1 ? 'rounded-br-md' : 'mb-1'}">${l}</div>`).join('')}<div class="flex items-center gap-1.5 mt-1 px-0.5"><span class="text-[11px] text-gray-400 tabular-nums">${time}</span></div></div>`
            pane.innerHTML = '<div>' +
                sep('Monday 5 October') +
                inc('16:02', ["Hi Alex, I'm Emily and I'll be your mentor. I studied Computer Science at Cambridge, so I know the application well.", 'What would you like to focus on first?']) +
                out('16:20', ["Hi Emily, thanks! I'd like to start with my personal statement. I've got a first draft ready.", "I'm also a bit nervous about the admissions test."]) +
                inc('16:31', ["Great, send the draft over and I'll read it before our first session. We can plan your test practice too.", 'Does Thursday at 5pm work for you? Book it through the portal when you get a chance.']) +
                sep('Today') +
                out('09:14', ["I've just booked it. Thanks, see you on Thursday!"]) +
                '</div>'
            pane.scrollTop = 0
        })
        await shot(page, 'messages')
    },
    async sessions(page) {
        await go(page, '/dashboard/student/sessions')
        await page.getByRole('button', { name: /^Past/ }).first().click().catch(() => {})
        await page.waitForTimeout(600)
        await shot(page, 'sessions-past')
        await page.getByRole('button', { name: /^Upcoming/ }).first().click().catch(() => {})
        await page.waitForTimeout(600)
        await shot(page, 'sessions-upcoming')
    },
    async booking(page) {
        await go(page, '/dashboard/student/sessions')
        await page.locator('button[title="Book a session"]').first().click()
        await page.waitForTimeout(1000)
        // Add three slots locally (no request is sent). First slot uses the
        // default start time; later ones pick a later start from the menu.
        const addBtn = page.getByRole('button', { name: 'Add Time Slot' })
        for (let i = 0; i < 3; i++) {
            try {
                if (i > 0) {
                    await page.locator('button[aria-haspopup="listbox"]').first().click()
                    await page.waitForTimeout(300)
                    const opts = page.locator('[role="listbox"] [role="option"]')
                    const count = await opts.count()
                    await opts.nth(Math.min(count - 1, 8 * i)).click()
                    await page.waitForTimeout(300)
                }
                await addBtn.click()
                await page.waitForTimeout(400)
            } catch (e) {
                console.log('slot', i, 'skipped:', e.message)
            }
        }
        await shot(page, 'booking')
        await page.keyboard.press('Escape')
    },
    async feedback(page) {
        await go(page, '/dashboard/student/sessions')
        await page.getByRole('button', { name: /^Past/ }).first().click().catch(() => {})
        await page.waitForTimeout(600)
        const link = page.getByRole('link', { name: 'Leave Feedback' }).first()
        const href = await link.getAttribute('href').catch(() => null)
        if (!href) return console.log('no feedback link found')
        await go(page, href)
        await shot(page, 'feedback')
    },
    async recordings(page) {
        await go(page, '/dashboard/student/recordings')
        await page.waitForTimeout(2500)
        await shot(page, 'recordings')
    },
    async reports(page) {
        await go(page, '/dashboard/student/reports')
        await page.locator('main button.w-full').first().click().catch(() => {})
        await page.waitForTimeout(800)
        await shot(page, 'reports')
    },
    async hours(page) {
        await go(page, '/dashboard/student')
        await page.locator('button[aria-label*="session hours remaining"]').first().click()
        await page.waitForTimeout(800)
        await shot(page, 'hours')
    },
    async help(page) {
        await go(page, '/dashboard/student')
        await page.locator('button[aria-label="Help & Support"]').first().click()
        await page.waitForTimeout(800)
        await shot(page, 'help')
    },
    async settings(page) {
        await go(page, '/dashboard/settings')
        await shot(page, 'settings')
    },
    async mobile(page, ctx) {
        const m = await ctx.newPage()
        await m.setViewportSize({ width: 390, height: 844 })
        await go(m, '/dashboard/student')
        await shot(m, 'mobile-home')
        await m.close()
    },
    async login(page) {
        // Captured last-in-order only if requested explicitly.
    },
}

;(async () => {
    const ctx = await chromium.launchPersistentContext(PROFILE, {
        headless: false,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    })
    const page = ctx.pages()[0] || (await ctx.newPage())
    await page.goto(BASE + '/dashboard/student').catch(() => {})
    if (!page.url().includes('/dashboard/student')) {
        await page.waitForTimeout(1500)
        await shot(page, 'login').catch(() => {})
        console.log('WAITING_FOR_LOGIN: please sign in as the test student in the opened window')
        await page.waitForURL(/\/dashboard\/student/, { timeout: 15 * 60 * 1000 })
        await page.waitForTimeout(3000)
    }
    console.log('LOGGED_IN')
    // Production safety: from here on, abort every non-GET request (Supabase
    // writes, server actions, API POSTs) so viewing pages cannot change data.
    // Installed after sign-in because the login form is itself a server action.
    await ctx.route('**/*', (route) => {
        const r = route.request()
        const m = r.method()
        const u = r.url()
        if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue()
        if (u.includes('/auth/v1/')) return route.continue()
        if (u.includes('/storage/v1/object/sign')) return route.continue()
        console.log('BLOCKED', m, u.replace(/\?.*/, ''))
        return route.abort()
    })
    const names = only.length ? only : Object.keys(steps).filter((k) => k !== 'login')
    for (const name of names) {
        try {
            await steps[name](page, ctx)
        } catch (e) {
            console.log('FAILED', name, e.message)
        }
    }
    await ctx.close()
    console.log('DONE')
})()
