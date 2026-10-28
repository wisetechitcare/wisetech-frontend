// Launches devtools/<name>.sh (node devtools/run.mjs push|pull) with a real bash. On Windows a bare `bash` can resolve to the
// WSL stub in System32, which fails when no distro is installed — so find Git's bash instead.
import { spawnSync, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const name = process.argv[2]
if (!name || !/^[a-z]+$/.test(name)) { console.error('usage: node devtools/run.mjs <push|pull>'); process.exit(1) }
const script = join(dirname(fileURLToPath(import.meta.url)), name + '.sh')

function findBash() {
  if (process.platform !== 'win32') return 'bash'
  const candidates = []
  try {
    // <git>/mingw64/libexec/git-core  ->  <git>/bin/bash.exe
    const exec = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim()
    candidates.push(resolve(exec, '..', '..', '..', 'bin', 'bash.exe'))
  } catch { /* git not on PATH; fall through to the usual install spots */ }
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs')]) {
    if (base) candidates.push(join(base, 'Git', 'bin', 'bash.exe'))
  }
  return candidates.find(existsSync)
}

const bash = findBash()
if (!bash) {
  console.error('Git Bash not found. Install Git for Windows (https://git-scm.com), then run again.')
  process.exit(1)
}
const result = spawnSync(bash, [script, ...process.argv.slice(3)], { stdio: 'inherit' })
process.exit(result.status ?? 1)
