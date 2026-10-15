#!/usr/bin/env node
/**
 * Terminal status board for git hooks.
 *
 * - Fixed-width box (every row same length, closed borders)
 * - ASCII progress bar only (█/░ are double-width in many Windows fonts)
 * - Windows / CI: one final frame (no duplicate boards)
 * - Optional live spinner: set HOOKS_LIVE=1
 */
import readline from 'node:readline'

const canColor =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  !process.env.CI

/** Live in-place updates — opt-in on Windows (Husky/Cursor erase is flaky). */
const live =
  canColor &&
  (process.env.HOOKS_LIVE === '1' ||
    (process.platform !== 'win32' && process.env.HOOKS_LIVE !== '0'))

const c = {
  reset: canColor ? '\x1b[0m' : '',
  dim: canColor ? '\x1b[2m' : '',
  green: canColor ? '\x1b[32m' : '',
  red: canColor ? '\x1b[31m' : '',
  cyan: canColor ? '\x1b[36m' : '',
  yellow: canColor ? '\x1b[33m' : '',
  bold: canColor ? '\x1b[1m' : '',
}

const SPIN = ['|', '/', '-', '\\']
/** Inner width between the vertical borders (exclusive of │). */
const INNER = 56
/** Block chars are single-column in Cursor/Windows Terminal; keep bar short so the row always fits. */
const BAR_W = 32
const BAR_FILL = '█'
const BAR_EMPTY = '░'

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '')
}

/** Pad / truncate to exactly `width` visible characters. */
function fit(text, width) {
  let s = String(text ?? '').replace(/[\r\n\t]/g, ' ')
  const vis = stripAnsi(s)
  if (vis.length > width) {
    return `${vis.slice(0, Math.max(0, width - 1))}…`
  }
  return `${vis}${' '.repeat(width - vis.length)}`
}

function top() {
  return `${c.cyan}┌${'─'.repeat(INNER)}┐${c.reset}`
}
function mid() {
  return `${c.cyan}├${'─'.repeat(INNER)}┤${c.reset}`
}
function bot() {
  return `${c.cyan}└${'─'.repeat(INNER)}┘${c.reset}`
}

/** One content row: │ + INNER chars + │ */
function row(plainText) {
  return `${c.cyan}│${c.reset}${fit(plainText, INNER)}${c.cyan}│${c.reset}`
}

/** Content row with a colored prefix (prefix visible length must be known). */
function rowMarked(prefixPlain, prefixColored, restPlain) {
  const restW = INNER - prefixPlain.length
  return `${c.cyan}│${c.reset}${prefixColored}${fit(restPlain, restW)}${c.cyan}│${c.reset}`
}

function progressRow(pct, failed) {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)))
  const filled = Math.round((p / 100) * BAR_W)
  const empty = BAR_W - filled
  const color = failed ? c.red : p >= 100 ? c.green : c.cyan
  const pctText = `${String(p).padStart(3, ' ')}%`
  const barPlain = ` [${BAR_FILL.repeat(filled)}${BAR_EMPTY.repeat(empty)}] ${pctText}`
  const barColored = ` ${color}[${BAR_FILL.repeat(filled)}${c.dim}${BAR_EMPTY.repeat(empty)}${c.reset}${color}]${c.reset} ${c.bold}${pctText}${c.reset}`
  const pad = INNER - barPlain.length
  if (pad < 0) return row(barPlain)
  return `${c.cyan}│${c.reset}${barColored}${' '.repeat(pad)}${c.cyan}│${c.reset}`
}

function writeSafe(text) {
  try {
    process.stdout.write(text)
  } catch {
    /* broken pipe */
  }
}

function printWhatToDo(titleText, tips) {
  const tipsList = (Array.isArray(tips) ? tips : [tips]).filter(Boolean)
  const head = ' What to do '
  const fill = Math.max(0, INNER - head.length)
  writeSafe(`\n${c.red}┌${head}${'─'.repeat(fill)}┐${c.reset}\n`)
  writeSafe(`${c.red}│${c.reset}${fit(` ${titleText}`, INNER)}${c.red}│${c.reset}\n`)
  for (const tip of tipsList) {
    writeSafe(`${c.red}│${c.reset}${fit(`  ${tip}`, INNER)}${c.red}│${c.reset}\n`)
  }
  writeSafe(`${c.red}└${'─'.repeat(INNER)}┘${c.reset}\n\n`)
}

export function createBoard(title, stepNames) {
  if (!Array.isArray(stepNames) || stepNames.length === 0) {
    throw new Error('Status board needs at least one step name.')
  }

  const steps = stepNames.map((name) => ({
    name: String(name || 'Unnamed step'),
    status: 'wait',
  }))
  let spinIdx = 0
  let timer = null
  let lastLines = 0
  let tick = 0
  let disposed = false
  let drawn = false

  function doneCount() {
    return steps.filter((s) => s.status === 'ok').length
  }

  function hasFail() {
    return steps.some((s) => s.status === 'fail')
  }

  function percent() {
    const n = steps.length || 1
    const base = (doneCount() / n) * 100
    if (hasFail() || disposed) return base
    if (!steps.some((s) => s.status === 'run')) return base
    const slice = 100 / n
    const pulse = ((tick % 24) / 24) * slice * 0.9
    return Math.min(99, base + pulse)
  }

  function erase() {
    if (!live || !drawn || lastLines <= 0) return
    try {
      readline.moveCursor(process.stdout, 0, -lastLines)
      readline.clearScreenDown(process.stdout)
    } catch {
      writeSafe(`\x1b[${lastLines}A\x1b[0J`)
    }
    lastLines = 0
  }

  function stepLines() {
    const out = []
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]
      let markPlain
      let markColored
      // All marks are exactly 6 visible chars so columns stay aligned.
      if (s.status === 'ok') {
        markPlain = ' [OK] '
        markColored = ` ${c.green}[OK]${c.reset} `
      } else if (s.status === 'fail') {
        markPlain = '[FAIL]'
        markColored = `${c.red}[FAIL]${c.reset}`
      } else if (s.status === 'run') {
        const sp = SPIN[spinIdx % SPIN.length]
        markPlain = `  [${sp}] `
        markColored = `  ${c.yellow}[${sp}]${c.reset} `
      } else {
        markPlain = '  [ ] '
        markColored = `  ${c.dim}[ ]${c.reset} `
      }
      const label =
        s.status === 'run' ? `${i + 1}. ${s.name} …` : `${i + 1}. ${s.name}`
      out.push(rowMarked(markPlain, markColored, label))
    }
    return out
  }

  /**
   * @param {string} [finalMessage]
   * @param {{ force?: boolean }} [opts]
   */
  function paint(finalMessage, opts = {}) {
    if (disposed && !finalMessage) return
    const force = Boolean(opts.force)
    if (!live && !force) return

    erase()

    const titlePlain = fit(` ${title || 'Checks'}`, INNER)
    const lines = [
      top(),
      `${c.cyan}│${c.reset}${c.bold}${titlePlain}${c.reset}${c.cyan}│${c.reset}`,
      mid(),
      progressRow(percent(), hasFail()),
      mid(),
      ...stepLines(),
      bot(),
    ]

    if (finalMessage) {
      lines.push('')
      lines.push(finalMessage)
    }

    writeSafe(`${lines.join('\n')}\n`)
    drawn = true
    lastLines = finalMessage ? 0 : lines.length
  }

  function stopSpin() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function startSpin() {
    stopSpin()
    if (!live || disposed) return
    timer = setInterval(() => {
      if (disposed) {
        stopSpin()
        return
      }
      spinIdx += 1
      tick += 1
      paint()
    }, 120)
    if (typeof timer.unref === 'function') timer.unref()
  }

  function assertIndex(index, method) {
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      throw new Error(`Status board.${method}: invalid step index ${index}`)
    }
  }

  return {
    start() {
      if (disposed) return
      tick = 0
      drawn = false
      lastLines = 0
    },
    running(index) {
      if (disposed) return
      assertIndex(index, 'running')
      steps[index].status = 'run'
      spinIdx = 0
      paint()
      startSpin()
    },
    pass(index) {
      if (disposed) return
      assertIndex(index, 'pass')
      stopSpin()
      steps[index].status = 'ok'
      tick = 0
      paint()
    },
    fail(index, titleText, tips) {
      assertIndex(index, 'fail')
      stopSpin()
      steps[index].status = 'fail'
      paint(undefined, { force: true })
      printWhatToDo(titleText || 'Check failed.', tips)
      lastLines = 0
      drawn = false
    },
    crash(titleText, tips) {
      stopSpin()
      const running = steps.findIndex((s) => s.status === 'run')
      const target = running >= 0 ? running : Math.max(0, steps.length - 1)
      steps[target].status = 'fail'
      paint(undefined, { force: true })
      printWhatToDo(titleText || 'Something went wrong.', tips)
      lastLines = 0
      drawn = false
    },
    success(message = 'All checks passed.') {
      if (disposed) return
      stopSpin()
      tick = 0
      paint(`${c.green}${c.bold}✓ ${message}${c.reset}`, { force: true })
      lastLines = 0
      drawn = false
    },
    dispose() {
      disposed = true
      stopSpin()
      lastLines = 0
    },
  }
}
