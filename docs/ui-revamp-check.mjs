#!/usr/bin/env node
// UI revamp safety gates (see docs/ui-revamp-plan.md, section 11).
//
//   G1  No backend file changed: nothing under app/api, app/auth, lib, utils,
//       supabase, migrations, scripts, config, nor proxy.ts, next.config.ts,
//       vercel.json, nor any file that is a server-action module.
//   G2  Behaviour contract: across every UI file in app/ and components/, the
//       totals of server-action and data imports, Supabase calls, form field
//       names, submit buttons, links, router calls, redirects, search-param
//       keys, fetch targets, storage keys, cookies, key listeners, browser
//       dialogs, location changes and 'use server' markers must match the base.
//       Moving code between files is fine; adding or dropping any item is not.
//   G7  No em dashes in any changed file.
//
// Usage: node docs/ui-revamp-check.mjs [baseRef] [--final]   (default base: main)
// Exit 0 = all gates pass, 1 = something to review (listed with files).

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'main'
const ROOTS = ['app', 'components']
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

// ── G1: backend paths ────────────────────────────────────────────────────────

const BACKEND = [
    /^app\/api\//, /^app\/auth\//, /^lib\//, /^utils\//, /^supabase\//, /^migrations\//,
    /^scripts\//, /^config\//, /^proxy\.ts$/, /^next\.config\.ts$/, /^vercel\.json$/,
    /(^|\/)actions\.ts$/, /(^|\/)route\.ts$/,
]
const changed = git('diff', '--name-only', BASE).split('\n').filter(Boolean)
// New files count only where the revamp works; other people's untracked scratch
// files elsewhere in the repo are not ours to judge. Our own work is committed
// per phase, so committed changes anywhere are always covered by `changed`.
const OURS = [/^app\//, /^components\//, /^assets\//, /^public\//, /^docs\/ui-revamp/]
const untracked = git('ls-files', '--others', '--exclude-standard')
    .split('\n')
    .filter((f) => f && OURS.some((re) => re.test(f)))
const touched = [...new Set([...changed, ...untracked])]
const backendHits = touched.filter((f) => BACKEND.some((re) => re.test(f)))

// ── G2: behaviour contract ───────────────────────────────────────────────────

const isUiFile = (p) =>
    /\.(ts|tsx)$/.test(p) &&
    ROOTS.some((r) => p.startsWith(`${r}/`)) &&
    !/^app\/api\//.test(p) &&
    !/^app\/auth\//.test(p) &&
    // The revamp's own component gallery: dev-only (notFound() in production),
    // so it can't change live behaviour, and its demo handlers would be noise.
    !/^app\/dashboard\/ui-preview\//.test(p)

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else out.push(p)
    }
    return out
}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

const RULES = [
    { cat: 'supabase table', re: /\.from\(\s*(['"`][^'"`]+['"`])/g, pick: (m) => m[1] },
    { cat: 'supabase rpc', re: /\.rpc\(\s*(['"`][^'"`]+['"`])/g, pick: (m) => m[1] },
    { cat: 'supabase write', re: /\.(insert|update|upsert|delete)\(/g, pick: (m) => m[1] },
    { cat: 'supabase realtime', re: /\.channel\(\s*([^,)]+)/g, pick: (m) => norm(m[1]) },
    { cat: 'supabase auth', re: /\.auth\.(\w+)\(/g, pick: (m) => m[1] },
    { cat: 'form action prop', re: /\b(action|formAction)=\{([^}]+)\}/g, pick: (m) => `${m[1]}={${norm(m[2])}}` },
    { cat: 'form field name', re: /\bname=(?:"([^"]*)"|'([^']*)'|\{([^}]+)\})/g, pick: (m) => norm(m[1] ?? m[2] ?? `{${m[3]}}`) },
    { cat: 'submit button', re: /type=["']submit["']/g, pick: () => 'type="submit"' },
    { cat: 'href', re: /\bhref=(?:"([^"]*)"|'([^']*)'|\{([^}]+)\})/g, pick: (m) => norm(m[1] ?? m[2] ?? `{${m[3]}}`) },
    { cat: 'router call', re: /\brouter\.(push|replace|refresh|back|forward|prefetch)\(([^)]*)\)/g, pick: (m) => `${m[1]}(${norm(m[2])})` },
    { cat: 'redirect', re: /\b(redirect|notFound|permanentRedirect)\(([^)]*)\)/g, pick: (m) => `${m[1]}(${norm(m[2])})` },
    { cat: 'location change', re: /\b(?:window\.)?location\.(href\s*=|assign\(|replace\(|reload\()\s*([^;\n]*)/g, pick: (m) => `${m[1]}${norm(m[2])}` },
    { cat: 'search-param key', re: /[sS]earchParams\??\.(get|getAll|set|has|delete|append)\(\s*['"`]([^'"`]+)['"`]/g, pick: (m) => `${m[1]}('${m[2]}')` },
    { cat: 'url param key', re: /\b(?:params|qs|query|sp|usp)\.(set|append|delete|get)\(\s*['"`]([^'"`]+)['"`]/g, pick: (m) => `${m[1]}('${m[2]}')` },
    { cat: 'fetch', re: /\bfetch\(\s*([^,)]+)/g, pick: (m) => norm(m[1]) },
    { cat: 'storage key', re: /\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem)\(\s*([^,)]+)/g, pick: (m) => `${m[1]}.${m[2]}(${norm(m[3])})` },
    { cat: 'cookie write', re: /document\.cookie\s*=/g, pick: () => 'document.cookie =' },
    { cat: 'global key listener', re: /(window|document)\.addEventListener\(\s*['"](keydown|keyup|keypress)['"]/g, pick: (m) => `${m[1]}:${m[2]}` },
    { cat: 'browser dialog', re: /\b(?:window\.)?(confirm|alert|prompt)\(\s*([^)]*)\)/g, pick: (m) => `${m[1]}(${norm(m[2])})` },
    { cat: "'use server'", re: /^\s*['"]use server['"]/gm, pick: () => "'use server'" },
]
const INFO = [
    { cat: 'event handler (info)', re: /\b(on[A-Z]\w*)=\{([^{}]{0,120})\}/g, pick: (m) => `${m[1]}={${norm(m[2])}}` },
]

// Server actions, data helpers and anything else with runtime behaviour.
// `cn` from @/utils/lib is a styling helper and is used freely by the revamp.
const TRACKED_IMPORT = (mod) =>
    mod.startsWith('@/utils/') || mod.startsWith('@/lib/') || mod.startsWith('@/app/') || /(^|\/)actions$/.test(mod)

function dataImports(src) {
    const items = []
    const re = /\bimport\s+(type\s+)?((?:(?!\bimport\b)[^;])*?)\s+from\s+['"]([^'"]+)['"]/g
    for (const m of src.matchAll(re)) {
        if (m[1]) continue
        const mod = m[3]
        if (!TRACKED_IMPORT(mod)) continue
        const label = mod.startsWith('.') ? `.../${mod.split('/').pop()}` : mod
        const clause = m[2]
        const named = clause.match(/\{([\s\S]*)\}/)
        if (named) {
            for (let n of named[1].split(',')) {
                n = n.trim()
                if (!n || n.startsWith('type ')) continue
                const name = n.split(/\s+as\s+/)[0].trim()
                if (mod === '@/utils/lib' && name === 'cn') continue
                items.push(`${label} > ${name}`)
            }
        }
        const def = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, '').trim()
        if (def) items.push(`${label} > default ${def}`)
    }
    return items
}

// Components whose `name` / `action` props aren't form fields or form actions:
// Avatar's name picks initials, EmptyState's action is its button slot.
const NOT_FORM = new Set(['Avatar', 'MentorAvatar', 'EmptyState'])
const FORM_CATS = new Set(['form action prop', 'form field name'])
// The JSX tag a match sits in: the nearest `<Tag` before it.
const tagAt = (code, index) => /^<([A-Za-z][\w.]*)/.exec(code.slice(code.lastIndexOf('<', index)))?.[1]

function extract(src) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    const out = new Map()
    const add = (cat, item) => {
        if (!out.has(cat)) out.set(cat, [])
        out.get(cat).push(item)
    }
    for (const item of dataImports(code)) add('data import', item)
    for (const { cat, re, pick } of [...RULES, ...INFO]) {
        for (const m of code.matchAll(re)) {
            if (FORM_CATS.has(cat) && NOT_FORM.has(tagAt(code, m.index))) continue
            add(cat, pick(m))
        }
    }
    return out
}

function collect(files, read) {
    const total = new Map()
    for (const f of files) {
        for (const [cat, items] of extract(read(f))) {
            if (!total.has(cat)) total.set(cat, new Map())
            const m = total.get(cat)
            for (const it of items) {
                if (!m.has(it)) m.set(it, [])
                m.get(it).push(f)
            }
        }
    }
    return total
}

const baseFiles = git('ls-tree', '-r', '--name-only', BASE, '--', ...ROOTS).split('\n').filter(isUiFile)
const headFiles = ROOTS.flatMap((r) => walk(r)).filter(isUiFile)
const base = collect(baseFiles, (f) => git('show', `${BASE}:${f}`))
const head = collect(headFiles, (f) => readFileSync(f, 'utf8'))

const infoCats = new Set(INFO.map((r) => r.cat))
// Approved, explained differences (docs/ui-revamp-allowed.json): an item is
// excused only for the extra copies that live in the listed files.
const ALLOWED = existsSync('docs/ui-revamp-allowed.json')
    ? JSON.parse(readFileSync('docs/ui-revamp-allowed.json', 'utf8')).allowed
    : []
const excused = (cat, item, bf, hf) => {
    const rule = ALLOWED.find((a) => a.category === cat && a.item === item)
    if (!rule) return false
    const extra = hf.filter((f) => !bf.includes(f))
    return hf.length > bf.length && extra.every((f) => rule.files.includes(f))
}
const contractLines = []
let contractFailures = 0
for (const cat of [...new Set([...base.keys(), ...head.keys()])].sort()) {
    const b = base.get(cat) ?? new Map()
    const h = head.get(cat) ?? new Map()
    const diffs = []
    for (const it of [...new Set([...b.keys(), ...h.keys()])].sort()) {
        const bf = b.get(it) ?? []
        const hf = h.get(it) ?? []
        if (bf.length === hf.length) continue
        if (excused(cat, it, bf, hf)) continue
        const sign = hf.length > bf.length ? '+' : '-'
        const files = (list) => [...new Set(list)].join(', ') || 'none'
        diffs.push(`  ${sign} ${it}   [${bf.length} > ${hf.length}]  base: ${files(bf)}  now: ${files(hf)}`)
    }
    if (!diffs.length) continue
    const info = infoCats.has(cat)
    if (!info) contractFailures += diffs.length
    contractLines.push(`${info ? 'INFO' : 'FAIL'}  ${cat} (${diffs.length})`, ...diffs, '')
}

// ── G7: em dashes ────────────────────────────────────────────────────────────

const EM_DASH = String.fromCharCode(0x2014)
// By default only lines this branch adds are checked, because older copy and
// comments still hold em dashes until the clean-up phase removes them.
// --final checks every line of every changed file.
const FINAL = process.argv.includes('--final')
const addedLines = git('diff', '-U0', BASE)
    .split('\n')
    .reduce(
        (acc, line) => {
            if (line.startsWith('+++ b/')) acc.file = line.slice(6)
            else if (line.startsWith('@@')) acc.line = Number(/\+(\d+)/.exec(line)[1])
            else if (line.startsWith('+')) {
                if (line.includes(EM_DASH)) acc.hits.push(`  ${acc.file}:${acc.line}`)
                acc.line++
            }
            return acc
        },
        { file: '', line: 0, hits: [] },
    ).hits
const wholeFile = (f) =>
    readFileSync(f, 'utf8')
        .split('\n')
        .flatMap((line, i) => (line.includes(EM_DASH) ? [`  ${f}:${i + 1}`] : []))
const scanTargets = (FINAL ? touched : untracked).filter((f) => existsSync(f) && /\.(tsx?|mjs|js|css|md)$/.test(f))
const dashHits = [...new Set([...(FINAL ? [] : addedLines), ...scanTargets.flatMap(wholeFile)])]

// ── Report ───────────────────────────────────────────────────────────────────

console.log(`UI revamp gates against ${BASE}: ${touched.length} changed or new files\n`)

console.log(backendHits.length ? `FAIL  G1 backend files changed (${backendHits.length})` : 'PASS  G1 no backend files changed')
for (const f of backendHits) console.log(`  ${f}`)

console.log(
    contractFailures
        ? `\nFAIL  G2 behaviour contract: ${contractFailures} difference(s)`
        : `\nPASS  G2 behaviour contract (${baseFiles.length} > ${headFiles.length} UI files)`,
)
if (contractLines.length) console.log(contractLines.join('\n'))

console.log(dashHits.length ? `\nFAIL  G7 em dashes in changed files (${dashHits.length})` : '\nPASS  G7 no em dashes in changed files')
for (const d of dashHits.slice(0, 40)) console.log(d)

process.exit(backendHits.length || contractFailures || dashHits.length ? 1 : 0)
