#!/usr/bin/env node
/**
 * Runs local git-hook checks with a clear status board.
 *
 *   node scripts/hooks/run.mjs pre-commit
 *   node scripts/hooks/run.mjs pre-push   (reads git push refs from stdin)
 *   node scripts/hooks/run.mjs verify     (full local mirror of CI tests + types)
 */
import { spawn, spawnSync } from 'node:child_process'
import { createBoard } from './status-board.mjs'

const mode = process.argv[2]
const ZERO = '0000000000000000000000000000000000000000'
const PROTECTED = new Set(['main', 'master', 'develop'])
const MAX_LOG_CHARS = 200_000
const STDIN_TIMEOUT_MS = 15_000

const isWin = process.platform === 'win32'

/** Quote one argument for `cmd.exe /c` (Windows). */
function quoteCmdArg(value) {
  const s = String(value)
  if (!/[ \t"]/u.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}

/** Expected check failure — shown via the status board, not a stack trace. */
class CheckFailed extends Error {
  /**
   * @param {string} message
   * @param {{ tips?: string[], log?: string, code?: number, step?: number }} [opts]
   */
  constructor(message, opts = {}) {
    super(message)
    this.name = 'CheckFailed'
    this.tips = opts.tips || []
    this.log = opts.log || ''
    this.code = opts.code ?? 1
    this.step = opts.step
  }
}

function truncateLog(text) {
  const s = String(text || '')
  if (s.length <= MAX_LOG_CHARS) return s
  const head = Math.floor(MAX_LOG_CHARS * 0.7)
  const tail = MAX_LOG_CHARS - head
  return `${s.slice(0, head)}\n\n… (log truncated) …\n\n${s.slice(-tail)}`
}

function printLog(text) {
  const trimmed = truncateLog(text).trim()
  if (!trimmed) return
  console.log('')
  console.log(trimmed)
  console.log('')
}

function toolMissingTips(tool) {
  return [
    `Install or repair "${tool}" and make sure it is on your PATH.`,
    isWin ? 'Then reopen this terminal and try again.' : 'Then try again in this terminal.',
  ]
}

function runPnpm(args, env = {}) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    let child
    try {
      // Avoid spawn({ shell: true }) — it prints a Node security deprecation on Windows.
      if (isWin) {
        const line = ['pnpm', ...args].map(quoteCmdArg).join(' ')
        child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], {
          shell: false,
          windowsHide: true,
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } else {
        child = spawn('pnpm', args, {
          shell: false,
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      }
    } catch (e) {
      finish({
        status: 1,
        out: '',
        err: e?.message || String(e),
        signal: null,
        missing: e?.code === 'ENOENT',
      })
      return
    }

    let out = ''
    let err = ''
    const append = (bucket, chunk) => {
      const next = bucket + chunk.toString()
      return next.length > MAX_LOG_CHARS * 2 ? truncateLog(next) : next
    }

    child.stdout?.on('data', (d) => {
      out = append(out, d)
    })
    child.stderr?.on('data', (d) => {
      err = append(err, d)
    })

    child.on('error', (e) => {
      finish({
        status: 1,
        out,
        err: `${err}${e.message}\n`,
        signal: null,
        missing: e.code === 'ENOENT',
      })
    })

    child.on('close', (code, signal) => {
      finish({
        status: code == null ? 1 : code,
        out,
        err,
        signal: signal || null,
        missing: false,
      })
    })
  })
}

function runGit(args) {
  let result
  try {
    result = spawnSync('git', args, { encoding: 'utf8' })
  } catch (e) {
    return {
      ok: false,
      missing: e?.code === 'ENOENT',
      message: e?.message || String(e),
    }
  }
  if (result.error) {
    return {
      ok: false,
      missing: result.error.code === 'ENOENT',
      message: result.error.message,
    }
  }
  return {
    ok: true,
    status: result.status ?? 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

async function readStdinLines() {
  if (process.stdin.isTTY) return []

  return new Promise((resolve, reject) => {
    let buf = ''
    let settled = false
    const done = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }

    const timer = setTimeout(() => {
      done(resolve, buf.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    }, STDIN_TIMEOUT_MS)

    try {
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (chunk) => {
        buf += chunk
      })
      process.stdin.on('end', () => {
        done(resolve, buf.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
      })
      process.stdin.on('error', (e) => {
        done(reject, e)
      })
    } catch (e) {
      done(reject, e)
    }
  })
}

function checkProtectedBranches(lines) {
  for (const line of lines) {
    const parts = line.split(/\s+/)
    if (parts.length < 4) continue
    const [, localSha, remoteRef] = parts
    if (localSha === ZERO) continue
    const branch = String(remoteRef || '').replace(/^refs\/heads\//, '')
    if (PROTECTED.has(branch)) return branch
  }
  return null
}

function assertPnpmOk(result, step, failTitle, tips) {
  if (result.missing) {
    throw new CheckFailed('pnpm is not available.', {
      step,
      tips: toolMissingTips('pnpm'),
      log: result.err,
    })
  }
  if (result.signal) {
    throw new CheckFailed(`Check was interrupted (${result.signal}).`, {
      step,
      tips: ['Try the command again.', 'If this keeps happening, close other heavy processes and retry.'],
      log: `${result.out}${result.err}`,
    })
  }
  if (result.status !== 0) {
    throw new CheckFailed(failTitle, {
      step,
      tips,
      log: `${result.out}${result.err}`,
    })
  }
}

async function withBoard(title, stepNames, fn) {
  const board = createBoard(title, stepNames)
  let activeBoard = board
  const onSignal = (sig) => {
    try {
      activeBoard?.dispose()
    } catch {
      /* ignore */
    }
    console.error(`\nInterrupted (${sig}).`)
    process.exit(130)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  try {
    board.start()
    await fn(board)
  } catch (err) {
    if (err instanceof CheckFailed) {
      const step = Number.isInteger(err.step) ? err.step : undefined
      if (step != null) board.fail(step, err.message, err.tips)
      else board.crash(err.message, err.tips)
      printLog(err.log)
      process.exitCode = err.code || 1
      return
    }
    const msg = err?.message || String(err)
    board.crash('Unexpected error while running checks.', [
      msg,
      'If this keeps happening, open an issue with the message above.',
    ])
    if (err?.stack) printLog(err.stack)
    process.exitCode = 1
  } finally {
    try {
      board.dispose()
    } catch {
      /* ignore */
    }
    activeBoard = null
    process.removeListener('SIGINT', onSignal)
    process.removeListener('SIGTERM', onSignal)
  }
}

async function preCommit() {
  await withBoard('WiseTech Frontend · Pre-commit', ['Staged file checks (secrets + lint)'], async (board) => {
    board.running(0)
    const r = await runPnpm(['exec', 'lint-staged'])
    assertPnpmOk(r, 0, 'Something in your staged files needs a fix.', [
      '1. Read the messages below',
      '2. Try: pnpm run lint:fix',
      '3. git add <files>, then: git commit',
    ])
    board.pass(0)
    board.success('Ready to commit.')
  })
}

async function prePush() {
  await withBoard('WiseTech Frontend · Pre-push', ['Branch check', 'TypeScript'], async (board) => {
    board.running(0)
    let lines
    try {
      lines = await readStdinLines()
    } catch (e) {
      throw new CheckFailed('Could not read push refs from git.', {
        step: 0,
        tips: [
          'Retry: git push',
          'If you ran this script by hand, that is fine — branch check is skipped without stdin.',
        ],
        log: e?.message || String(e),
      })
    }
    const blocked = checkProtectedBranches(lines)
    if (blocked) {
      throw new CheckFailed(`Cannot push straight to "${blocked}".`, {
        step: 0,
        tips: ['Open a pull request from your feature branch instead.'],
      })
    }
    board.pass(0)

    board.running(1)
    const tc = await runPnpm(['run', 'type-check'])
    assertPnpmOk(tc, 1, 'TypeScript found errors.', [
      '1. Read the red lines below',
      '2. Fix them',
      '3. Try: git push',
    ])
    board.pass(1)
    board.success('Ready to push.')
  })
}

async function verify() {
  await withBoard(
    'WiseTech Frontend · Verify (like CI)',
    ['Guard self-test', 'Lint changed files', 'Unit tests', 'Task-domain tests', 'TypeScript'],
    async (board) => {
      board.running(0)
      const ht = await runPnpm(['run', 'hooks:test'])
      assertPnpmOk(ht, 0, 'Hook self-test failed.', [
        'Fix scripts/hooks/guard.mjs, then retry.',
      ])
      board.pass(0)

      board.running(1)
      const baseCheck = runGit(['rev-parse', '--verify', '-q', 'origin/main'])
      if (!baseCheck.ok) {
        if (baseCheck.missing) {
          throw new CheckFailed('git is not available.', {
            step: 1,
            tips: toolMissingTips('git'),
            log: baseCheck.message,
          })
        }
      } else if (baseCheck.status === 0) {
        const diff = runGit([
          'diff',
          '--name-only',
          '--diff-filter=ACMR',
          'origin/main...HEAD',
          '--',
          '*.ts',
          '*.tsx',
        ])
        if (!diff.ok) {
          throw new CheckFailed(
            diff.missing ? 'git is not available.' : 'Could not list changed TypeScript files.',
            {
              step: 1,
              tips: diff.missing
                ? toolMissingTips('git')
                : ['Run: git fetch origin', 'Then: pnpm verify'],
              log: diff.message || '',
            },
          )
        }
        if (diff.status !== 0) {
          throw new CheckFailed('Could not list changed TypeScript files.', {
            step: 1,
            tips: ['Run: git fetch origin', 'Then: pnpm verify'],
            log: (diff.stderr || diff.stdout || '').trim(),
          })
        }
        const files = diff.stdout
          .split(/\r?\n/)
          .filter((f) => f && !f.replace(/\\/g, '/').startsWith('src/_metronic/'))
        if (files.length) {
          const lint = await runPnpm(['exec', 'eslint', '--quiet', ...files])
          assertPnpmOk(lint, 1, 'Lint failed on files changed in this branch.', [
            'Try: pnpm run lint:fix',
            'Then: pnpm verify',
          ])
        }
      }
      board.pass(1)

      board.running(2)
      const tests = await runPnpm(['run', 'test'])
      assertPnpmOk(tests, 2, 'Unit tests failed.', [
        'Fix the failing tests, then: pnpm verify',
      ])
      board.pass(2)

      board.running(3)
      const tasks = await runPnpm(['run', 'test:tasks'])
      assertPnpmOk(tasks, 3, 'Task-domain tests failed.', [
        'Fix them, then: pnpm verify',
      ])
      board.pass(3)

      board.running(4)
      const tc = await runPnpm(['run', 'type-check'])
      assertPnpmOk(tc, 4, 'TypeScript found errors.', [
        'Fix the lines below, then: pnpm verify',
      ])
      board.pass(4)
      board.success('Verify passed — same bar as CI tests + types.')
    },
  )
}

async function main() {
  if (mode === 'pre-commit') return preCommit()
  if (mode === 'pre-push') return prePush()
  if (mode === 'verify') return verify()
  console.error('Usage: node scripts/hooks/run.mjs <pre-commit|pre-push|verify>')
  process.exitCode = 2
}

main().catch((err) => {
  console.error('\nUnexpected hook runner failure:')
  console.error(err?.stack || err)
  process.exitCode = 1
})
