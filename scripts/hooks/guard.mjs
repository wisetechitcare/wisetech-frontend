#!/usr/bin/env node
/**
 * Commit guard — runs from the pre-commit hook via lint-staged, which stashes
 * unstaged work first, so the files we read here are exactly what will land in
 * the commit (no false pass/fail from a partially-staged file).
 *
 * Modes:
 *   node scripts/hooks/guard.mjs <file>...            scan staged files
 *   node scripts/hooks/guard.mjs --commit-msg <path>  validate a commit message
 *   node scripts/hooks/guard.mjs --self-test          assert the rules still work
 *
 * Escape hatch: put `guard:allow` in a comment on the offending line. Prefer it
 * over `git commit --no-verify`, which turns off every check at once.
 */
import { readFileSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import assert from 'node:assert/strict'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOW = 'guard:allow'

/** Filenames that must never be committed, whatever their contents. */
const SECRET_FILES = /(^|[\\/])\.env(\.|$)|\.(pem|p12|pfx|key|keystore|jks|ppk)$|(^|[\\/])id_(rsa|dsa|ecdsa|ed25519)$/i

/** High-signal credential shapes. Deliberately narrow — a noisy scanner gets bypassed. */
const SECRET_RULES = [
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['AWS secret access key', /aws_?secret_?access_?key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}/i],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Stripe live key', /\b[sr]k_live_[A-Za-z0-9]{20,}\b/],
  ['Twilio SID/key', /\b(AC|SK)[0-9a-f]{32}\b/],
  ['JWT literal', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['connection string with password', /\b(mysql|postgres(?:ql)?|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s:@/]{3,}@/i],
]

/** Code smells that should never reach a shared branch. */
const CODE_RULES = [
  ['merge conflict marker', /^(<{7}|>{7}|\|{7})[ \t]/],
  ['leftover debugger', /(^|[\s;{])debugger\s*(;|$)/],
  ['focused test (.only)', /\b(describe|it|test|suite)\.only\s*\(/],
]

/** @returns {{line:number, rule:string, text:string}[]} */
export function scanText(text) {
  const hits = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes(ALLOW)) continue
    for (const [rule, re] of [...SECRET_RULES, ...CODE_RULES]) {
      if (re.test(line)) hits.push({ line: i + 1, rule, text: line.trim().slice(0, 120) })
    }
  }
  return hits
}

const COMMIT_TYPES = 'build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test'
const COMMIT_RE = new RegExp(`^(${COMMIT_TYPES})(\\([\\w .,/-]+\\))?!?: .{0,99}[^.]$`)
const COMMIT_EXEMPT = /^(Merge |Revert |fixup!|squash!|amend!)/

/** @returns {string|null} error message, or null if the message is fine */
export function validateCommitMsg(raw) {
  const subject = raw.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? ''
  if (!subject) return 'empty commit message'
  if (COMMIT_EXEMPT.test(subject)) return null
  if (COMMIT_RE.test(subject)) return null
  return `"${subject}" is not a Conventional Commit.

  Expected:  <type>(<optional scope>): <subject>
  Types:     ${COMMIT_TYPES.split('|').join(', ')}
  Rules:     subject is 1-100 chars and does not end with a period.
  Examples:  feat(leave): add sandwich-rule override per branch
             fix(payroll): stop double-counting arrears in Decimal sum`
}

function scanFiles(files) {
  const problems = []
  for (const file of files) {
    if (basename(file) === 'guard.mjs') continue // this file is all patterns

    if (SECRET_FILES.test(file)) {
      problems.push(`${file}: secret file must never be committed (add it to .gitignore)`)
      continue
    }

    let stat
    try {
      stat = statSync(file)
    } catch {
      continue // deleted between staging and hook
    }
    if (!stat.isFile()) continue // submodule / directory entry
    if (stat.size > MAX_BYTES) {
      const mb = (stat.size / 1024 / 1024).toFixed(1)
      problems.push(`${file}: ${mb} MB exceeds the ${MAX_BYTES / 1024 / 1024} MB limit — put binaries in S3 or Git LFS`)
      continue
    }

    const buf = readFileSync(file)
    if (buf.subarray(0, 8000).includes(0)) continue // binary
    for (const h of scanText(buf.toString('utf8'))) {
      problems.push(`${file}:${h.line}: ${h.rule}\n      ${h.text}`)
    }
  }
  return problems
}

function selfTest() {
  const hit = (s) => scanText(s).map((h) => h.rule)
  assert.deepEqual(hit('const k = "AKIA1234567890ABCDEF"'), ['AWS access key id'])
  assert.deepEqual(hit('DATABASE_URL="mysql://root:hunter2@localhost:3306/wt"'), ['connection string with password'])
  assert.deepEqual(hit('<<<<<<< HEAD'), ['merge conflict marker'])
  assert.deepEqual(hit('  debugger;'), ['leftover debugger'])
  assert.deepEqual(hit('it.only("x", () => {})'), ['focused test (.only)'])
  // no false positives on ordinary code
  assert.deepEqual(hit('const url = "mysql://localhost:3306/wt" // no creds'), [])
  assert.deepEqual(hit('// ======= section ======='), [])
  assert.deepEqual(hit('logger.debug("saving")'), [])
  assert.deepEqual(hit('await it.only'), []) // needs a call
  // the allow marker suppresses
  assert.deepEqual(hit('const example = "AKIA1234567890ABCDEF" // guard:allow docs sample'), [])

  const ok = (m) => assert.equal(validateCommitMsg(m), null, m)
  const bad = (m) => assert.ok(validateCommitMsg(m), m)
  ok('feat(leave): add per-branch sandwich override')
  ok('fix!: drop the legacy balance endpoint')
  ok('chore: bump prisma')
  ok('Merge branch main into fix/tables')
  ok('# comment\n\nrefactor(ui): extract ListHeader')
  bad('updated stuff')
  bad('feat: ')
  bad('feat(leave): trailing period.')
  bad('Feat: capitalised type')
  console.log('guard.mjs self-test: all assertions passed')
}

const [flag, ...rest] = process.argv.slice(2)

if (flag === '--self-test') {
  selfTest()
} else if (flag === '--commit-msg') {
  const error = validateCommitMsg(readFileSync(rest[0], 'utf8'))
  if (error) {
    console.error(`\n  commit-msg: ${error}\n`)
    process.exit(1)
  }
} else {
  const problems = scanFiles(process.argv.slice(2))
  if (problems.length) {
    console.error('\n  pre-commit guard blocked this commit:\n')
    for (const p of problems) console.error(`    ${p}`)
    console.error(`\n  Fix them, or mark an intentional line with a \`${ALLOW}\` comment.\n`)
    process.exit(1)
  }
}