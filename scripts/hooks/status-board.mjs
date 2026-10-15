#!/usr/bin/env node
/**
 * Terminal status board for git hooks — one fixed-width card.
 *
 * Success/fail paint a complete green/red card with the result footer
 * inside the box (no orphan "✓ …" line under a clipped fragment).
 *
 * Git hooks on Windows are not a TTY, so the green/red card used to be
 * stripped and only the final 100% frame showed. Colors stay on, and each
 * paint is flushed. Set HOOKS_LIVE=0 to print the final card only.
 */
import { writeSync } from 'node:fs'

const canColor =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  !process.env.CI

const live = canColor && process.env.HOOKS_LIVE !== '0'

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
const INNER = 56
const BAR_W = 32
const BAR_FILL = '█'
const BAR_EMPTY = '░'

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
  const col = frameColor(tone)
  return `${col}┌${'─'.repeat(INNER)}┐${c.reset}`
}
function mid(tone) {
  const col = frameColor(tone)
  return `${col}├${'─'.repeat(INNER)}┤${c.reset}`
}
function bot(tone) {
  const col = frameColor(tone)
  return `${col}└${'─'.repeat(INNER)}┘${c.reset}`
}

function row(plainText, tone = 'run') {
  const col = frameColor(tone)
  return `${col}│${c.reset}${fit(plainText, INNER)}${col}│${c.reset}`
}

function rowMarked(prefixPlain, prefixColored, restPlain, tone = 'run') {
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
  const pad = INNER - barPlain.length
  const col = frameColor(tone)
  if (pad < 0) return row(barPlain, tone)
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
  const head = ' Next steps '
  const fill = Math.max(0, INNER - head.length)
  writeSafe(`\n${c.red}┌${head}${'─'.repeat(fill)}┐${c.reset}\n`)
  writeSafe(`${c.red}│${c.reset}${fit(` ${titleText}`, INNER)}${c.red}│${c.reset}\n`)
  for (const tip of tipsList) {
    writeSafe(`${c.red}│${c.reset}${fit(`  → ${tip}`, INNER)}${c.red}│${c.reset}\n`)
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
    writeSafe(`\x1b[${lastLines}A\x1b[0J`)
    lastLines = 0
  }

  function stepLines(tone) {
    const out = []
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]
      let markPlain
      let markColored
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
      out.push(rowMarked(markPlain, markColored, label, tone))
    }
    return out
  }

  /**
   * @param {{ force?: boolean, tone?: 'run'|'ok'|'fail', footer?: string }} [opts]
   */
  function paint(opts = {}) {
    const force = Boolean(opts.force)
    const tone = opts.tone || (hasFail() ? 'fail' : 'run')
    const footer = opts.footer
    if (disposed && !force) return
    if (!live && !force) return

    erase()

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
      lines.push(mid(tone))
      const footerColor = tone === 'fail' ? c.red : c.green
      const footerPlain = fit(` ✓  ${footer}`, INNER)
      lines.push(
        `${col}│${c.reset}${footerColor}${c.bold}${footerPlain}${c.reset}${col}│${c.reset}`,
      )
    }

    lines.push(bot(tone))
    lines.push('')

    writeSafe(`${lines.join('\n')}\n`)
    drawn = true
    lastLines = footer || force ? 0 : lines.length
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
      paint()
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
      paint({ force: true, tone: 'fail' })
      printWhatToDo(titleText || 'Check failed.', tips)
      lastLines = 0
      drawn = false
    },
    crash(titleText, tips) {
      stopSpin()
      const running = steps.findIndex((s) => s.status === 'run')
      const target = running >= 0 ? running : Math.max(0, steps.length - 1)
      steps[target].status = 'fail'
      paint({ force: true, tone: 'fail' })
      printWhatToDo(titleText || 'Something went wrong.', tips)
      lastLines = 0
      drawn = false
    },
    success(message = 'All checks passed.') {
      if (disposed) return
      stopSpin()
      tick = 0
      paint({ force: true, tone: 'ok', footer: message })
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
