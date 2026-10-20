#!/usr/bin/env node
// UI revamp gate G3: "only class names changed" check for restyled files.
// For every modified .ts/.tsx file it blanks out string literals made purely
// of class-name characters (in both the base and the working copy) and
// compares what is left. Any remaining difference is a non-class change and is
// printed for review.
//
// Usage: node docs/ui-revamp-classonly-check.mjs [baseRef] [paths...]

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const [base = 'HEAD', ...paths] = process.argv.slice(2)
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20 })
const files = git('diff', '--name-only', base, '--', ...(paths.length ? paths : ['.']))
    .split('\n')
    .filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(f))

const CLASSY = /(['"`])([a-z0-9:/\[\]().%#_!&*>~+=, -]*[a-z][a-z0-9:/\[\]().%#_!&*>~+=, -]*)\1/g
const blank = (s) => s.replace(CLASSY, (_, q) => `${q}§${q}`)

let bad = 0
for (const f of files) {
    let before = ''
    try {
        before = git('show', `${base}:${f}`)
    } catch {
        continue // new file
    }
    const a = blank(before).split('\n')
    const b = blank(readFileSync(f, 'utf8')).split('\n')
    if (a.length !== b.length) {
        console.log(`x ${f}: line count changed (${a.length} > ${b.length})`)
        bad++
        continue
    }
    a.forEach((line, i) => {
        if (line !== b[i]) {
            bad++
            console.log(`x ${f}:${i + 1}\n    - ${line.trim()}\n    + ${b[i].trim()}`)
        }
    })
}
console.log(bad ? `\n${bad} non-class difference(s) to review.` : `ok ${files.length} files: only class-name strings changed.`)
process.exit(bad ? 1 : 0)
