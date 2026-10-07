const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const [src, out, label] = process.argv.slice(2)
const logo = fs.readFileSync(path.join(__dirname, 'logo-footer.b64'), 'utf8').trim()
;(async () => {
    const b = await chromium.launch()
    const p = await b.newPage()
    await p.goto('file://' + path.resolve(src), { waitUntil: 'networkidle' })
    await p.pdf({
        path: out,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;margin:0 17mm;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#8a8278;border-top:0.6px solid #cfae74;padding-top:5px;display:flex;align-items:center;justify-content:space-between;-webkit-print-color-adjust:exact"><span style="display:flex;align-items:center;gap:6px"><img src="data:image/png;base64,${logo}" style="width:17px;height:17px"><span>Access Oxbridge &middot; ${label}</span></span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        margin: { top: '16mm', bottom: '20mm', left: '17mm', right: '17mm' },
    })
    await b.close()
})()
