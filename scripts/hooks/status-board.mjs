#!/usr/bin/env node
/**
 * Terminal status board for git hooks — ONE fixed-width card.
 *
 * - Card appears immediately (0%) so the terminal never looks stuck.
 * - It is updated IN PLACE (cursor up + overwrite, one write per frame,
 *   no clear-screen between frames), so it does not blink or stack.
 * - When finished, the card is replaced once by the final green/red card.
 *
 * Fallbacks: CI / NO_COLOR / narrow terminal / HOOKS_LIVE=0 → final card only.
 */
import { writeSync } from 'node:fs'

const INNER = 48
const FRAME_MS = 250

const cols = process.stdout.columns || process.stderr.columns || 0
const canColor =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  !process.env.CI

const live =
  canColor &&
  process.env.HOOKS_LIVE !== '0' &&
  (cols === 0 || cols >= INNER + 4)

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
const BAR_W = 28
const BAR_FILL = '█'
const BAR_EMPTY = '░'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '')
}

function fit(text, width) {
  const vis = stripAnsi(String(text ?? '').replace(/[\r\n\t]/g, ' '))
  if (vis.length > width) return `${vis.slice(0, Math.max(0, width - 1))}…`
  return `${vis}${' '.repeat(width - vis.length)}`
}

function frameColor(tone) {
  if (tone === 'ok') return c.green
  if (tone === 'fail') return c.red
  return c.cyan
}

function top(tone) {
  return `${frameColor(tone)}┌${'─'.repeat(INNER)}┐${c.reset}`
}
function mid(tone) {
  return `${frameColor(tone)}├${'─'.repeat(INNER)}┤${c.reset}`
}
function bot(tone) {
  return `${frameColor(tone)}└${'─'.repeat(INNER)}┘${c.reset}`
}

function rowMarked(prefixPlain, prefixColored, restPlain, tone) {
  const col = frameColor(tone)
  const restW = INNER - prefixPlain.length
  return `${col}│${c.reset}${prefixColored}${fit(restPlain, restW)}${col}│${c.reset}`
}

function progressRow(pct, tone) {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)))
  const filled = Math.round((p / 100) * BAR_W)
  const empty = BAR_W - filled
  const barColor = tone === 'fail' ? c.red : tone === 'ok' || p >= 100 ? c.green : c.cyan
  const pctText = `${String(p).padStart(3, ' ')}%`
  const barPlain = ` [${BAR_FILL.repeat(filled)}${BAR_EMPTY.repeat(empty)}] ${pctText}`
  const barColored = ` ${barColor}[${BAR_FILL.repeat(filled)}${c.dim}${BAR_EMPTY.repeat(empty)}${c.reset}${barColor}]${c.reset} ${c.bold}${pctText}${c.reset}`
  const pad = Math.max(0, INNER - barPlain.length)
  const col = frameColor(tone)
  return `${col}│${c.reset}${barColored}${' '.repeat(pad)}${col}│${c.reset}`
}

function writeSafe(text) {
  try {
    if (typeof process.stdout.fd === 'number') writeSync(process.stdout.fd, text)
    else process.stdout.write(text)
  } catch {
    try {
      process.stdout.write(text)
    } catch {
      /* broken pipe */
    }
  }
}

function printWhatToDo(titleText, tips) {
  const tipsList = (Array.isArray(tips) ? tips : [tips]).filter(Boolean)
  const head = ' What to do '
  const fill = Math.max(0, INNER - head.length)
  const lines = [
    '',
    `${c.red}┌${head}${'─'.repeat(fill)}┐${c.reset}`,
    `${c.red}│${c.reset}${fit(` ${titleText}`, INNER)}${c.red}│${c.reset}`,
    ...tipsList.map((tip) => `${c.red}│${c.reset}${fit(`  ${tip}`, INNER)}${c.red}│${c.reset}`),
    `${c.red}└${'─'.repeat(INNER)}┘${c.reset}`,
    '',
  ]
  writeSafe(`${lines.join('\n')}\n`)
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
  let disposed = false
  let cursorHidden = false
  let stepStartedAt = Date.now()

  function doneCount() {
    return steps.filter((s) => s.status === 'ok').length
  }

  function hasFail() {
    return steps.some((s) => s.status === 'fail')
  }

  /** Finished steps + smooth creep inside the running step (never loops back). */
  function percent() {
    const n = steps.length || 1
    const base = (doneCount() / n) * 100
    if (hasFail() || disposed) return base
    if (!steps.some((s) => s.status === 'run')) return base
    const slice = 100 / n
    const elapsedSec = Math.max(0, (Date.now() - stepStartedAt) / 1000)
    const creep = slice * 0.92 * (1 - Math.exp(-elapsedSec / 25))
    return Math.min(99, base + creep)
  }

  function stepLines(tone) {
    const out = []
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]
      let markPlain
      let markColored
      let label = `${i + 1}. ${s.name}`
      if (s.status === 'ok') {
        markPlain = ' [OK] '
        markColored = ` ${c.green}[OK]${c.reset} `
      } else if (s.status === 'fail') {
        markPlain = '[FAIL]'
        markColored = `${c.red}[FAIL]${c.reset}`
        label = ` ${label}`
      } else if (s.status === 'run') {
        const sp = SPIN[spinIdx % SPIN.length]
        markPlain = `  [${sp}] `
        markColored = `  ${c.yellow}[${sp}]${c.reset} `
        label = `${label} …`
      } else {
        markPlain = '  [ ] '
        markColored = `  ${c.dim}[ ]${c.reset} `
      }
      out.push(rowMarked(markPlain, markColored, label, tone))
    }
    return out
  }

  function buildLines(tone, footer) {
    const col = frameColor(tone)
    const titlePlain = fit(` ${title || 'Checks'}`, INNER)
    const lines = [
      top(tone),
      `${col}│${c.reset}${c.bold}${titlePlain}${c.reset}${col}│${c.reset}`,
      mid(tone),
      progressRow(percent(), tone),
      mid(tone),
      ...stepLines(tone),
    ]
    if (footer) {
      const footerColor = tone === 'fail' ? c.red : c.green
      lines.push(mid(tone))
      lines.push(
        `${col}│${c.reset}${footerColor}${c.bold}${fit(` ✓  ${footer}`, INNER)}${c.reset}${col}│${c.reset}`,
      )
    }
    lines.push(bot(tone))
    return lines
  }

  function showCursor() {
    if (!cursorHidden) return
    cursorHidden = false
    writeSafe(SHOW_CURSOR)
  }

  /** In-place frame: move up, overwrite each line, clear only to end of line. */
  function paintLive() {
    if (!live || disposed) return
    const lines = buildLines(hasFail() ? 'fail' : 'run')
    let out = ''
    if (!cursorHidden) {
      out += HIDE_CURSOR
      cursorHidden = true
    }
    if (lastLines > 0) out += `\x1b[${lastLines}A`
    for (const line of lines) out += `\r${line}\x1b[K\n`
    writeSafe(out)
    lastLines = lines.length
  }

  /** Final card: replace the live card once (or just print it when not live). */
  function paintFinal(tone, footer) {
    let out = ''
    if (live && lastLines > 0) out += `\x1b[${lastLines}A\x1b[0J`
    lastLines = 0
    out += `${buildLines(tone, footer).join('\n')}\n`
    if (cursorHidden) {
      out += SHOW_CURSOR
      cursorHidden = false
    }
    writeSafe(out)
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
      paintLive()
    }, FRAME_MS)
    if (typeof timer.unref === 'function') timer.unref()
  }

  function assertIndex(index, method) {
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      throw new Error(`Status board.${method}: invalid step index ${index}`)
    }
  }

  process.once('exit', showCursor)

  return {
    start() {
      if (disposed) return
      stepStartedAt = Date.now()
      paintLive()
      startSpin()
    },
    running(index) {
      if (disposed) return
      assertIndex(index, 'running')
      steps[index].status = 'run'
      stepStartedAt = Date.now()
      paintLive()
      startSpin()
    },
    pass(index) {
      if (disposed) return
      assertIndex(index, 'pass')
      steps[index].status = 'ok'
      paintLive()
    },
    fail(index, titleText, tips) {
      assertIndex(index, 'fail')
      stopSpin()
      steps[index].status = 'fail'
      paintFinal('fail')
      printWhatToDo(titleText || 'Check failed.', tips)
    },
    /** Unexpected crash / tool missing — mark running step (or last) as failed. */
    crash(titleText, tips) {
      stopSpin()
      const running = steps.findIndex((s) => s.status === 'run')
      const target = running >= 0 ? running : Math.max(0, steps.length - 1)
      steps[target].status = 'fail'
      paintFinal('fail')
      printWhatToDo(titleText || 'Something went wrong.', tips)
    },
    success(message = 'All checks passed.') {
      if (disposed) return
      stopSpin()
      paintFinal('ok', message)
    },
    /** Always call on exit paths so the spinner and cursor cannot leak. */
    dispose() {
      disposed = true
      stopSpin()
      showCursor()
      lastLines = 0
    },
  }
}
