#!/usr/bin/env node
/**
 * Terminal status board for git hooks — one fixed-width result card.
 *
 * While checks run: one progress line on stderr (flushed, no blink).
 * When done: that line is cleared and a single green/red card is printed.
 * Opt-in in-place card spinner: HOOKS_LIVE=1
 */
import { writeSync } from 'node:fs'

const canColor =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  !process.env.CI

const live = canColor && process.env.HOOKS_LIVE === '1'

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
const INNER = 48
const BAR_W = 28
const BAR_FILL = '█'
const BAR_EMPTY = '░'
const PROGRESS_PAD = 72

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
  if (pad < 0) return rowMarked('', '', barPlain, tone)
  return `${col}│${c.reset}${barColored}${' '.repeat(pad)}${col}│${c.reset}`
}

function writeOut(text) {
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

function writeErr(text) {
  try {
    if (typeof process.stderr.fd === 'number') writeSync(process.stderr.fd, text)
    else process.stderr.write(text)
  } catch {
    try {
      process.stderr.write(text)
    } catch {
      /* broken pipe */
    }
  }
}

function miniBar(pct) {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)))
  const w = 20
  const filled = Math.round((p / 100) * w)
  return `[${BAR_FILL.repeat(filled)}${BAR_EMPTY.repeat(w - filled)}] ${String(p).padStart(3, ' ')}%`
}

function printWhatToDo(titleText, tips) {
  const tipsList = (Array.isArray(tips) ? tips : [tips]).filter(Boolean)
  const head = ' Next steps '
  const fill = Math.max(0, INNER - head.length)
  writeOut(`\n${c.red}┌${head}${'─'.repeat(fill)}┐${c.reset}\n`)
  writeOut(`${c.red}│${c.reset}${fit(` ${titleText}`, INNER)}${c.red}│${c.reset}\n`)
  for (const tip of tipsList) {
    writeOut(`${c.red}│${c.reset}${fit(`  → ${tip}`, INNER)}${c.red}│${c.reset}\n`)
  }
  writeOut(`${c.red}└${'─'.repeat(INNER)}┘${c.reset}\n\n`)
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
  let beatTimer = null
  let lastLines = 0
  let tick = 0
  let disposed = false
  let drawn = false
  let progressShown = false
  let stepStartedAt = 0

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
    const elapsedSec = Math.max(0, (Date.now() - stepStartedAt) / 1000)
    const crept = Math.min(slice * 0.85, elapsedSec * 2.5)
    return Math.min(99, base + crept)
  }

  function clearProgressLine() {
    if (!progressShown) return
    writeErr(`\r${' '.repeat(PROGRESS_PAD)}\r`)
    progressShown = false
  }

  function showProgress() {
    if (live || disposed) return
    const running = steps.findIndex((s) => s.status === 'run')
    const idx = running >= 0 ? running : Math.max(0, doneCount() - 1)
    const name = steps[idx]?.name || 'Checks'
    const n = steps.length
    const elapsed = Math.max(0, Math.round((Date.now() - stepStartedAt) / 1000))
    const suffix = running >= 0 ? (elapsed >= 1 ? `running… ${elapsed}s` : 'running…') : 'OK'
    const line = `${miniBar(percent())}  ${idx + 1}/${n}  ${name} ${suffix}`
    writeErr(`\r${fit(line, PROGRESS_PAD - 1)}`)
    progressShown = true
  }

  function erase() {
    if (!live || !drawn || lastLines <= 0) return
    writeOut(`\x1b[${lastLines}A\x1b[0J`)
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
        s.status === 'run'
          ? `${i + 1}. ${s.name} …`
          : s.status === 'fail'
            ? ` ${i + 1}. ${s.name}`
            : `${i + 1}. ${s.name}`
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

    writeOut(`${lines.join('\n')}\n`)
    drawn = true
    lastLines = live && !footer && !force ? lines.length : 0
  }

  function stopSpin() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function stopBeat() {
    if (beatTimer) {
      clearInterval(beatTimer)
      beatTimer = null
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

  function startBeat() {
    stopBeat()
    if (live || disposed) return
    showProgress()
    beatTimer = setInterval(() => {
      if (disposed) {
        stopBeat()
        return
      }
      showProgress()
    }, 1000)
    if (typeof beatTimer.unref === 'function') beatTimer.unref()
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
      if (!live) {
        writeErr(`${title || 'Checks'}\n`)
        return
      }
      paint()
    },
    running(index) {
      if (disposed) return
      assertIndex(index, 'running')
      steps[index].status = 'run'
      spinIdx = 0
      stepStartedAt = Date.now()
      if (!live) {
        startBeat()
        return
      }
      paint()
      startSpin()
    },
    pass(index) {
      if (disposed) return
      assertIndex(index, 'pass')
      stopSpin()
      stopBeat()
      steps[index].status = 'ok'
      tick = 0
      if (!live) {
        showProgress()
        return
      }
      paint()
    },
    fail(index, titleText, tips) {
      assertIndex(index, 'fail')
      stopSpin()
      stopBeat()
      clearProgressLine()
      steps[index].status = 'fail'
      paint({ force: true, tone: 'fail' })
      printWhatToDo(titleText || 'Check failed.', tips)
      lastLines = 0
      drawn = false
    },
    crash(titleText, tips) {
      stopSpin()
      stopBeat()
      clearProgressLine()
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
      stopBeat()
      clearProgressLine()
      tick = 0
      paint({ force: true, tone: 'ok', footer: message })
      lastLines = 0
      drawn = false
    },
    dispose() {
      disposed = true
      stopSpin()
      stopBeat()
      clearProgressLine()
      lastLines = 0
    },
  }
}
