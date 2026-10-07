// Screenshot capture for the mentor portal guide.
// Uses the mentor's saved sign-in. Every non-GET request (Supabase writes,
// server actions, API POSTs) is aborted, so viewing pages cannot change data.
const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:3000'
const OUT = path.join(__dirname, 'shots-mentor')
const PROFILE = path.join(__dirname, 'profile-mentor')
const only = process.argv.slice(2)
require('fs').mkdirSync(OUT, { recursive: true })

async function tidy(page, opts = {}) {
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
    await page.evaluate((opts) => {
        const MENTOR = 'Dr Emily Carter'
        const STUDENT = 'Alex Morgan'
        const BIO = 'Cambridge Computer Science graduate. I help students with personal statements, admissions tests and interview practice.'
        const exact = {
            'A brief bio about yourself': BIO,
            'd': 'Thanks, see you on Thursday!',
            'You: d': 'You: Great, see you on Thursday!',
            'sup': 'Welcome to your group chat!',
            'Ancient Greek': 'Computer Science',
            'Architecture': 'Mathematics',
            'Archaeology and Anthropology': 'Personal Statements',
            'Archaeology': 'Interview Practice',
            'R': 'A',
            '55': '2',
        }
        // Mentor's own name appears in the sidebar footer, greeting, profile and settings.
        const isMentorSpot = (el) =>
            !!el.closest('aside button') || !!el.closest('aside') && /MENTOR/i.test(el.closest('aside').textContent) && !!el.closest('[title]') ||
            /Welcome back|Thank you for applying|glad to have you/.test(el.textContent || '') ||
            (opts.mentorDefault && !/Student/.test(el.textContent || '') && !/Student/.test(el.parentElement?.textContent || '')) ||
            (el.parentElement && /^(Name|Full Name)/.test(el.parentElement.textContent.trim()) && el.parentElement.children.length <= 3)
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        const nodes = []
        let n
        while ((n = walker.nextNode())) nodes.push(n)
        for (const t of nodes) {
            let v = t.nodeValue
            const trimmed = v.trim()
            if (exact[trimmed]) { t.nodeValue = v.replace(trimmed, exact[trimmed]); continue }
            v = v.replace(/\s*\[(STUDENT|MENTOR|TEST)\]/gi, '')
            v = v.replace(/rajvishwakarma303@gmail\.com/g, 'emily.carter@example.com')
            v = v.replace(/rajvishwakarma0221@gmail\.com/g, 'alex.morgan@example.com')
            v = v.replace(/Utsav Atri/g, 'Claire Marlowe')
            v = v.replace(/Welcome back, Raj Vishwakarma/g, 'Welcome back, Emily')
            if (/gfds/.test(v)) v = 'We worked through two practice interview questions and the structure of the personal statement.'
            if (/Raj Vishwakarma\s*·/.test(v) || /·/.test(t.parentElement?.textContent || '') && /\dh \d+m/.test(t.parentElement?.textContent || '')) {
                v = v.replace(/Raj Vishwakarma/g, STUDENT)
            }
            if (v.includes('Raj Vishwakarma')) {
                v = v.replace(/Raj Vishwakarma/g, isMentorSpot(t.parentElement) ? MENTOR : STUDENT)
            }
            if (v !== t.nodeValue) t.nodeValue = v
        }
        for (const el of document.querySelectorAll('input, textarea')) {
            const v = el.value || ''
            let nv = v
            if (/Raj Vishwakarma/.test(v)) nv = MENTOR
            if (/rajvishwakarma303/.test(v)) nv = 'emily.carter@example.com'
            if (/brief bio/i.test(v)) nv = BIO
            if (el.type === 'tel' || /^\+?\d[\d\s]{6,}$/.test(v)) nv = '+44 7700 900123'
            if (el.placeholder && /University of Oxford/.test(el.placeholder) && v) nv = 'University of Cambridge'
            if (nv !== v) el.value = nv
        }
        for (const sel of document.querySelectorAll('select')) {
            if (/Calcutta|Kolkata/.test(sel.value) && [...sel.options].some((o) => o.value === 'Europe/London')) sel.value = 'Europe/London'
        }
        for (const t of [...document.querySelectorAll('p, span, div')].filter((e) => e.children.length === 0 && /You have \d+ reports to complete/.test(e.textContent))) {
            t.textContent = t.textContent.replace(/You have \d+ reports/, 'You have 2 reports')
        }
        const avatar = (initials, bg) =>
            'data:image/svg+xml;utf8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#fff">${initials}</text></svg>`)
        for (const img of document.querySelectorAll('img')) {
            const src = img.getAttribute('src') || ''
            if (src.includes('logo')) continue
            const mentorImg = !!img.closest('aside') || /Profile photo|Your Details|Change photo|Upload photo/.test(img.closest('section, form, div.rounded-2xl')?.textContent || '')
            img.src = mentorImg ? avatar('EC', '#092c68') : avatar('AM', '#4f868e')
            img.srcset = ''
        }
    }, opts)
    await page.waitForTimeout(400)
}

async function go(page, url) {
    await page.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1500)
}

async function closeCheckin(page) {
    // The post-session check-in may pop up on load. Close it visually only
    // (its write is blocked by the route guard).
    const close = page.locator('[aria-label="Post-session check-in"] button[aria-label="Close"], button[aria-label="Close"]').first()
    if (await page.getByText('Quick check-in').first().isVisible().catch(() => false)) {
        await page.screenshot({ path: path.join(OUT, '_checkin-live.png') })
        await close.click().catch(() => {})
        await page.waitForTimeout(500)
    }
}

async function shot(page, name, opts = {}) {
    await tidy(page, opts)
    await page.screenshot({ path: path.join(OUT, name + '.png') })
    console.log('saved', name)
}

const SAMPLE_REQUEST = `
<div class="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
  <div class="p-6 sm:p-10 flex-1">
    <div class="flex items-center gap-4 mb-8">
      <div class="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent font-black text-2xl shadow-inner">A</div>
      <div><h3 class="text-2xl font-black text-gray-900">Alex Morgan</h3><span class="text-xs font-bold text-accent uppercase tracking-widest bg-accent/5 px-3 py-1 rounded-full">New Request</span></div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
      <div class="space-y-1 sm:col-span-2"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">Academic Interests</h4><p class="text-gray-700 leading-relaxed font-medium">Algorithms and how computers solve hard problems. I have been reading about graph theory and cryptography.</p></div>
      <div class="space-y-1 sm:col-span-2"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">Extracurriculars</h4><p class="text-gray-700 leading-relaxed font-medium">School coding club lead, UKMT Senior Maths Challenge (Gold), volunteer at a local primary school.</p></div>
      <div class="space-y-1"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">Subjects</h4><div class="flex flex-wrap gap-2"><span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">Mathematics (A*)</span><span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">Further Maths (A*)</span><span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">Physics (A)</span></div></div>
      <div class="space-y-1"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">Target Universities</h4><div class="flex flex-wrap gap-2"><span class="bg-accent/10 text-accent px-3 py-1 rounded-lg text-sm font-medium">Cambridge</span></div></div>
      <div class="space-y-1"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">Curriculum</h4><p class="text-gray-700 leading-relaxed font-medium">A-Level</p></div>
      <div class="space-y-1"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">School</h4><p class="text-gray-700 leading-relaxed font-medium">Westminster School, United Kingdom</p></div>
      <div class="space-y-1 sm:col-span-2"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-tight">Available Time Slots</h4><p class="text-xs text-gray-500 mb-2">Timezone: Europe/London</p>
        <div class="flex flex-wrap gap-2 mt-2"><span class="bg-accent/10 text-accent px-3 py-1.5 rounded-lg text-sm font-medium">Thu 15 Oct, 17:00 - 18:00</span><span class="bg-accent/10 text-accent px-3 py-1.5 rounded-lg text-sm font-medium">Sat 17 Oct, 10:00 - 11:00</span><span class="bg-accent/10 text-accent px-3 py-1.5 rounded-lg text-sm font-medium">Mon 19 Oct, 18:00 - 19:00</span></div></div>
    </div>
  </div>
  <div class="p-6 sm:p-10 bg-gray-50/50 w-full md:w-80 flex flex-col justify-center gap-4">
    <button class="w-full py-5 bg-accent text-white font-black rounded-2xl text-lg">Select a Time Slot</button>
    <button class="w-full py-4 text-gray-400 font-bold">Decline</button>
  </div>
</div>`

const SAMPLE_THREAD = (() => {
    const sep = (label) => `<div class="flex items-center gap-3 py-3"><span class="flex-1 h-px bg-gray-200/70"></span><span class="text-[11px] font-medium text-gray-400 tracking-wide">${label}</span><span class="flex-1 h-px bg-gray-200/70"></span></div>`
    const inc = (time, lines) => `<div class="flex gap-2.5 mb-3"><div class="w-8 shrink-0"><div class="w-8 h-8 rounded-full bg-[#4f868e] text-white flex items-center justify-center text-xs font-semibold">AM</div></div><div class="min-w-0 max-w-[85%]"><div class="flex items-baseline gap-2 mb-1"><span class="text-[13px] font-semibold text-gray-900">Alex Morgan</span><span class="text-[11px] text-gray-400 tabular-nums">${time}</span></div>${lines.map((l) => `<div class="text-gray-700 mb-1.5">${l}</div>`).join('')}</div></div>`
    const out = (time, lines) => `<div class="flex flex-col items-end mb-3">${lines.map((l, i) => `<div class="max-w-[70%] px-3.5 py-2.5 rounded-2xl bg-accent text-white ${i === lines.length - 1 ? 'rounded-br-md' : 'mb-1'}">${l}</div>`).join('')}<div class="flex items-center gap-1.5 mt-1 px-0.5"><span class="text-[11px] text-gray-400 tabular-nums">${time}</span></div></div>`
    return '<div>' +
        sep('Monday 5 October') +
        out('16:02', ["Hi Alex, I'm Emily and I'll be your mentor. I studied Computer Science at Cambridge, so I know the application well.", 'What would you like to focus on first?']) +
        inc('16:20', ["Hi Emily, thanks! I'd like to start with my personal statement. I've got a first draft ready.", "I'm also a bit nervous about the admissions test."]) +
        out('16:31', ["Great, send the draft over and I'll read it before our first session. We can plan your test practice too.", 'Does Thursday at 5pm work for you? Book it through the portal when you get a chance.']) +
        sep('Today') +
        inc('09:14', ["I've just booked it. Thanks, see you on Thursday!"]) +
        '</div>'
})()

const steps = {
    async dashboard(page) {
        await go(page, '/dashboard/mentor')
        await closeCheckin(page)
        await shot(page, 'dashboard')
    },
    async training(page) {
        await go(page, '/dashboard/mentor/training')
        await closeCheckin(page)
        await shot(page, 'training')
    },
    async requests(page) {
        await go(page, '/dashboard/mentor/requests')
        await closeCheckin(page)
        await page.evaluate((html) => {
            const empty = [...document.querySelectorAll('h3, h2, p')].find((e) => /No pending requests/.test(e.textContent))
            let box = empty
            while (box && box.parentElement && !/space-y|grid|max-w/.test(box.parentElement.className)) box = box.parentElement
            if (box) box.outerHTML = html
        }, SAMPLE_REQUEST)
        await shot(page, 'requests')
    },
    async sessions(page) {
        await go(page, '/dashboard/mentor/sessions')
        await closeCheckin(page)
        await page.getByRole('button', { name: /^Completed/ }).first().click().catch(() => {})
        await page.waitForTimeout(600)
        await shot(page, 'sessions')
    },
    async requestSession(page) {
        await go(page, '/dashboard/mentor/sessions')
        await closeCheckin(page)
        await page.getByRole('button', { name: 'Request a Session' }).first().click()
        await page.waitForTimeout(800)
        await shot(page, 'request-session')
    },
    async report(page) {
        await go(page, '/dashboard/mentor/sessions')
        await closeCheckin(page)
        await page.getByRole('button', { name: /^Completed/ }).first().click().catch(() => {})
        await page.waitForTimeout(600)
        const link = page.getByRole('link', { name: /Submit Report/ }).first()
        const href = await link.getAttribute('href').catch(() => null)
        if (!href) return console.log('no Submit Report link')
        await go(page, href)
        await shot(page, 'report-form')
    },
    async students(page) {
        await go(page, '/dashboard/mentor/students')
        await closeCheckin(page)
        await page.evaluate(() => {
            for (const el of document.querySelectorAll('span')) {
                if (/^\s*Profile incomplete\s*$/.test(el.textContent) && el.children.length <= 1) el.style.display = 'none'
            }
        })
        await shot(page, 'students')
    },
    async messages(page) {
        await go(page, '/dashboard/mentor/messages')
        await closeCheckin(page)
        await page.waitForTimeout(1500)
        await page.evaluate((html) => {
            const pane = document.querySelector('div.h-full.overflow-y-auto')
            if (pane) { pane.innerHTML = html; pane.scrollTop = 0 }
        }, SAMPLE_THREAD)
        await shot(page, 'messages')
    },
    async reports(page) {
        await go(page, '/dashboard/mentor/reports')
        await closeCheckin(page)
        await page.evaluate(() => {
            const btns = [...document.querySelectorAll('a, button')].filter((b) => /Submit Report/.test(b.textContent))
            btns.slice(2).forEach((b) => {
                let card = b
                while (card.parentElement && card.parentElement.querySelectorAll('a, button').length < 3 + 0 && !/space-y/.test(card.parentElement.className)) card = card.parentElement
                card.style.display = 'none'
            })
        })
        await shot(page, 'reports')
    },
    async payouts(page) {
        await go(page, '/dashboard/mentor/payouts')
        await closeCheckin(page)
        await shot(page, 'payouts', { mentorDefault: true })
        await page.getByRole('button', { name: /Create invoice/ }).first().click().catch((e) => console.log('no create invoice', e.message))
        await page.waitForTimeout(2500)
        await page.evaluate(() => {
            const h = [...document.querySelectorAll('h2, h3, h4, p, span')].find((e) => /Select sessions to invoice/.test(e.textContent) && e.children.length === 0)
            if (h) h.scrollIntoView({ block: 'start' })
            for (const el of document.querySelectorAll('*')) {
                if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollTop > 0) el.scrollTop -= 90
            }
        })
        await page.waitForTimeout(600)
        await shot(page, 'invoicing', { mentorDefault: true })
    },
    async availability(page) {
        await go(page, '/dashboard/mentor/availability')
        await closeCheckin(page)
        await shot(page, 'availability')
    },
    async profile(page) {
        await go(page, '/dashboard/mentor/profile')
        await closeCheckin(page)
        await shot(page, 'profile')
    },
    async settings(page) {
        await go(page, '/dashboard/settings')
        await closeCheckin(page)
        await shot(page, 'settings')
    },
    async checkin(page) {
        await go(page, '/dashboard/mentor-checkin-preview')
        await page.getByText('Nothing booked').first().click().catch((e) => console.log('checkin click', e.message))
        await page.waitForTimeout(1200)
        await shot(page, 'checkin')
    },
    async mobile(page, ctx) {
        const m = await ctx.newPage()
        await m.setViewportSize({ width: 390, height: 844 })
        await go(m, '/dashboard/mentor')
        await closeCheckin(m)
        await shot(m, 'mobile')
        await m.close()
    },
}

;(async () => {
    const ctx = await chromium.launchPersistentContext(PROFILE, {
        headless: true,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    })
    await ctx.route('**/*', (route) => {
        const r = route.request()
        const m = r.method()
        const u = r.url()
        if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue()
        if (u.includes('/auth/v1/token') || u.includes('/auth/v1/user')) return route.continue()
        if (u.includes('/storage/v1/object/sign')) return route.continue()
        console.log('BLOCKED', m, u.replace(/\?.*/, ''))
        return route.abort()
    })
    const page = ctx.pages()[0] || (await ctx.newPage())
    await page.goto(BASE + '/dashboard/mentor').catch(() => {})
    if (!page.url().includes('/dashboard/mentor')) {
        console.log('NOT_LOGGED_IN', page.url())
        await ctx.close()
        return
    }
    const names = only.length ? only : Object.keys(steps)
    for (const name of names) {
        try {
            await steps[name](page, ctx)
        } catch (e) {
            console.log('FAILED', name, e.message.split('\n')[0])
        }
    }
    await ctx.close()
    console.log('DONE')
})()
