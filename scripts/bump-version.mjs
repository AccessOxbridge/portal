#!/usr/bin/env node
/**
 * Pre-commit version bump: bumps package.json's patch version and stages it so
 * it lands inside the commit being written.
 *
 * This deliberately runs at commit time rather than push time. The obvious
 * alternative — bump on pre-push and fold it in with `git commit --amend` —
 * does not work: `git push` resolves the SHAs it is going to send BEFORE the
 * pre-push hook runs, so the amended commit is never what gets transferred.
 * The remote receives the pre-bump commit while the local branch moves to the
 * amended one, leaving every push diverged (ahead 1, behind 1) and the
 * deployed version permanently one behind.
 *
 * Bumping here needs no history rewriting at all: the new version is simply
 * part of the commit from the start.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

// Resolved from the CWD git invokes the hook in (the repo root), NOT from this
// script's own file location.
const root = process.cwd();
const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();

// A merge or a rebase replays or combines work that already carries its own
// version; bumping there would double-count it and can conflict on replay.
for (const marker of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REBASE_HEAD', 'rebase-merge', 'rebase-apply']) {
  if (existsSync(resolve(gitDir, marker))) process.exit(0);
}

const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

if ([major, minor, patch].some((n) => Number.isNaN(n))) {
  console.error(`[bump-version] package.json version "${pkg.version}" isn't major.minor.patch — skipping bump`);
  process.exit(0);
}

pkg.version = `${major}.${minor}.${patch + 1}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
execSync('git add package.json', { stdio: 'ignore' });

console.log(`[bump-version] package.json -> v${pkg.version}`);
