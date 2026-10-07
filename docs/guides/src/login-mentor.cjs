const { chromium } = require('playwright')
const path = require('path')
;(async () => {
    const ctx = await chromium.launchPersistentContext(path.join(__dirname, 'profile-mentor'), {
        headless: false, viewport: { width: 1440, height: 900 },
    })
    const page = ctx.pages()[0] || (await ctx.newPage())
    await page.goto('http://localhost:3000/login')
    console.log('WAITING_FOR_LOGIN')
    await page.waitForURL(/\/dashboard\/mentor/, { timeout: 20 * 60 * 1000 })
    await page.waitForTimeout(3000)
    console.log('LOGGED_IN', page.url())
    await ctx.close()
})()
