#!/usr/bin/env bash
# Shared by every tool in devtools/: terminal helpers, spinner, menus, checklist, repo health.
# Sourced, never run directly. Loading it twice is harmless.

[ -n "${DEVTOOLS_COMMON:-}" ] && return 0
DEVTOOLS_COMMON=1
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # the repo: devtools/lib/ -> devtools/ -> repo
# Protected branches come from the pre-push hook itself, so the scripts and the hook can never disagree.
PROTECTED=" main master develop "   # fallback if the hook can't be read
if [ -f "$ROOT/scripts/hooks/run.mjs" ]; then
  _p=$(sed -n "s/.*PROTECTED = new Set(\[\(.*\)\]).*/\1/p" "$ROOT/scripts/hooks/run.mjs" | head -1 | tr ',' ' ' | tr -d "'\"")
  read -ra _pa <<<"$_p"
  [ ${#_pa[@]} -gt 0 ] && PROTECTED=" ${_pa[*]} "
fi
COMMIT_ONLY=${COMMIT_ONLY:-0}     # 1 = commit without offering a push (set by pnpm pull)
TITLE=${TITLE:-tools}
PM=npm; command -v pnpm >/dev/null && [ -f "$ROOT/pnpm-lock.yaml" ] && PM=pnpm
NAME=$(basename "$ROOT")

# ── terminal ────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  B=$'\e[1m'; D=$'\e[2m'; R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; BL=$'\e[34m'; M=$'\e[35m'; C=$'\e[36m'; N=$'\e[0m'
else
  B=''; D=''; R=''; G=''; Y=''; BL=''; M=''; C=''; N=''
fi
COLS=$(tput cols 2>/dev/null || echo 80); [ "$COLS" -gt 100 ] && COLS=100
TMPS=()
SPIN_PID=""; SPIN_LABEL=""
# A credential prompt inside a spinner would hang invisibly, so make git fail fast instead.
export GIT_TERMINAL_PROMPT=0
[ -t 0 ] || [ -n "${DEVTOOLS_ALLOW_PIPE:-}" ] || { echo "This tool is interactive — run it from a terminal." >&2; exit 1; }
hide() { printf '\e[?25l'; }
show() { printf '\e[?25h'; }
cleanup() { show; [ ${#TMPS[@]} -gt 0 ] && rm -f "${TMPS[@]}"; }
trap cleanup EXIT
on_interrupt() {
  show
  if [ -n "$SPIN_PID" ] && kill -0 "$SPIN_PID" 2>/dev/null; then
    kill "$SPIN_PID" 2>/dev/null; wait "$SPIN_PID" 2>/dev/null
    printf '\n\n  %sCancelled while "%s" was running.%s\n' "$Y" "$SPIN_LABEL" "$N"
    printf '  %sCheck where things stand with: git status%s\n\n' "$D" "$N"
  else
    printf '\n  %sCancelled.%s\n\n' "$Y" "$N"
  fi
  exit 130
}
trap on_interrupt INT TERM

rule() { local w=$((COLS - 4)) s; printf -v s '%*s' "$w" ''; printf '  %s%s%s\n' "$D" "${s// /─}" "$N"; }
step() { printf '\n  %s%s%s\n' "$B$C" "$1" "$N"; rule; }
ok()   { printf '  %s✔%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s▲%s %s\n' "$Y" "$N" "$1"; }
bad()  { printf '  %s✘%s %s\n' "$R" "$N" "$1"; }
note() { printf '  %s%s%s\n' "$D" "$1" "$N"; }
die()  { show; printf '\n  %s✘ %s%s\n\n' "$R$B" "$1" "$N" >&2; exit 1; }
trunc() { local s=$1 w=$2; if [ ${#s} -gt "$w" ]; then printf '…%s' "${s: -$((w - 1))}"; else printf '%s' "$s"; fi; }

banner() {
  clear 2>/dev/null || printf '\e[2J\e[H'
  printf '\n  %s╭─────────────────────────────────────────────╮%s\n' "$C" "$N"
  printf '  %s│%s  %s%-43s%s%s│%s\n' "$C" "$N" "$B" "Wisetech - ${TITLE:-tools}" "$N" "$C" "$N"
  printf '  %s╰─────────────────────────────────────────────╯%s\n' "$C" "$N"
}

# ── spinner: spin "label" cmd args…  → runs quietly, shows ✔/✘ and elapsed time. Output in $LOG.
LOG=""
spin() {
  local label=$1; shift
  LOG=$(mktemp) || die "Cannot create a temporary file."
  TMPS+=("$LOG")
  local start=$SECONDS f=0 frames=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏) pid rc secs slow
  # stdin from /dev/null: a task that tries to read the keyboard would swallow keystrokes or hang
  "$@" </dev/null >"$LOG" 2>&1 &
  pid=$!; SPIN_PID=$pid; SPIN_LABEL=$label
  hide
  while kill -0 "$pid" 2>/dev/null; do
    secs=$((SECONDS - start)); slow=""
    [ "$secs" -gt 60 ] && slow=" · still running — Ctrl+C to cancel"
    printf '\r  %s%s%s %s %s%ds%s%s\e[K' "$C" "${frames[f % 10]}" "$N" "$label" "$D" "$secs" "$slow" "$N"
    f=$((f + 1)); sleep 0.08
  done
  wait "$pid"; rc=$?
  SPIN_PID=""
  show
  secs=$((SECONDS - start))
  if [ $rc -eq 0 ]; then printf '\r  %s✔%s %s %s%ds%s\e[K\n' "$G" "$N" "$label" "$D" "$secs" "$N"
  else printf '\r  %s✘%s %s %s%ds%s\e[K\n' "$R" "$N" "$label" "$D" "$secs" "$N"; fi
  return $rc
}
showlog() { # last lines of $LOG in a red-ruled block
  printf '  %s┌ output ─%s\n' "$R" "$N"
  sed 's/\x1b\[[0-9;?]*[a-zA-Z]//g' "$LOG" | tail -n "${1:-25}" | sed "s/^/  ${R}│${N} /"
  printf '  %s└─%s\n' "$R" "$N"
}

# ── turn a failed git command's output ($LOG) into a plain-language next step ─
explain_git_error() {
  local t; t=$(sed 's/\x1b\[[0-9;?]*[a-zA-Z]//g' "$LOG")
  case "$t" in
    *index.lock*) warn "git's index is locked — another git process is running, or one crashed. If none is, delete .git/index.lock" ;;
    *"protected branch"*|*GH006*|*GH013*) warn "GitHub protects this branch — push a feature branch and open a pull request" ;;
    *"Authentication failed"*|*"could not read Username"*|*"terminal prompts disabled"*|*"Permission denied"*|*"returned error: 403"*) warn "GitHub rejected your credentials — sign in again (Git Credential Manager) and check you have write access to this repo" ;;
    *"Could not resolve host"*|*"unable to access"*|*"Connection timed out"*|*"Connection refused"*|*"Failed to connect"*|*"Could not read from remote"*) warn "can't reach GitHub — check your internet / VPN, then run again" ;;
    *"non-fast-forward"*|*"fetch first"*|*"[rejected]"*) warn "origin has commits you don't — run pnpm pull, then pnpm push again" ;;
    *"file size limit"*|*GH001*|*"larger than"*) warn "a file is too big for GitHub (100 MB limit) — take it out of the commit: git rm --cached <file>" ;;
    *"Please tell me who you are"*|*"empty ident"*) warn "git identity not set — git config --global user.name 'Your Name' and user.email you@example.com" ;;
    *"unrelated histories"*) warn "these branches share no history — pull from a different branch" ;;
    *"untracked working tree files would be overwritten"*) warn "untracked files in your folder clash with incoming ones — move or delete the files listed above, then pull again" ;;
    *"would be overwritten by merge"*|*"Your local changes"*) warn "your uncommitted changes touch files the pull changes — commit them first (pnpm pull offers to)" ;;
    *"Couldn't find remote ref"*|*"couldn't find remote ref"*) warn "that branch doesn't exist on origin" ;;
    *"nothing to commit"*|*"no changes added"*) warn "nothing was staged to commit" ;;
    *"pre-push"*|*"Pre-push"*|*"pre-commit"*|*"Pre-commit"*|*"commit-msg"*|*husky*) warn "a git hook stopped this — fix what it reports above, then run again" ;;
  esac
}

# ── menu: menu "title" ARRAY [default]  → MENU_IDX; returns 1 on esc/q. Set MENU_OFF[i]=1 to disable.
MENU_IDX=0; MENU_OFF=(); MENU_KEY=""
readkey() { # → KEY: up down enter space esc a q or the char
  local k rest
  IFS= read -rsn1 k || { KEY=esc; return; }
  case "$k" in
    $'\e') IFS= read -rsn2 -t 0.05 rest; case "$rest" in '[A') KEY=up;; '[B') KEY=down;; '') KEY=esc;; *) KEY=other;; esac ;;
    '') KEY=enter ;;
    ' ') KEY=space ;;
    k) KEY=up ;; j) KEY=down ;;
    *) KEY=$k ;;
  esac
}
menu() {
  local title=$1; local -n _it=$2; local sel=${3:-0} n=${#_it[@]} i
  while [ "${MENU_OFF[sel]:-}" = 1 ]; do sel=$(((sel + 1) % n)); done
  hide
  printf '  %s%s%s  %s↑↓ move · enter select · esc cancel%s\n' "$B" "$title" "$N" "$D" "$N"
  while :; do
    for i in "${!_it[@]}"; do
      if [ "${MENU_OFF[i]:-}" = 1 ]; then printf '    %s%s%s\e[K\n' "$D" "${_it[i]}" "$N"
      elif [ "$i" -eq "$sel" ]; then printf '  %s❯ %s%s\e[K\n' "$C$B" "${_it[i]}" "$N"
      else printf '    %s\e[K\n' "${_it[i]}"; fi
    done
    readkey
    case "$KEY" in
      up)   i=$sel; while :; do sel=$(((sel - 1 + n) % n)); [ "${MENU_OFF[sel]:-}" = 1 ] || break; done ;;
      down) while :; do sel=$(((sel + 1) % n)); [ "${MENU_OFF[sel]:-}" = 1 ] || break; done ;;
      enter) break ;;
      esc|q) MENU_KEY=$KEY; printf '\e[%dA\e[J' $((n + 1)); show; MENU_OFF=(); return 1 ;;
      [1-9]) [ "$KEY" -le "$n" ] && [ "${MENU_OFF[KEY - 1]:-}" != 1 ] && sel=$((KEY - 1)) ;;
    esac
    printf '\e[%dA' "$n"
  done
  MENU_IDX=$sel
  printf '\e[%dA\e[J' $((n + 1))
  printf '  %s✔%s %s %s%s%s\n' "$G" "$N" "$title" "$B" "$(sed 's/\x1b\[[0-9;]*m//g' <<<"${_it[sel]}")" "$N"
  show; MENU_OFF=()
}

# ── checklist: checklist "title" LABELS SELECTED(array of 0/1, edited in place)
checklist() {
  local title=$1; local -n _lb=$2; local -n _sl=$3
  local n=${#_lb[@]} cur=0 top=0 i H=$(($(tput lines 2>/dev/null || echo 24) - 10)) cnt
  [ "$H" -gt 16 ] && H=16; [ "$H" -lt 5 ] && H=5; [ "$n" -lt "$H" ] && H=$n
  hide
  while :; do
    cnt=0; for i in "${!_sl[@]}"; do [ "${_sl[i]}" = 1 ] && cnt=$((cnt + 1)); done
    printf '  %s%s%s  %s%d of %d selected%s\e[K\n' "$B" "$title" "$N" "$D" "$cnt" "$n" "$N"
    for ((i = top; i < top + H; i++)); do
      local box="○"; [ "${_sl[i]}" = 1 ] && box="${G}●${N}"
      if [ "$i" -eq "$cur" ]; then printf '  %s❯%s %s %s\e[K\n' "$C$B" "$N" "$box" "${_lb[i]}"
      else printf '    %s %s\e[K\n' "$box" "${_lb[i]}"; fi
    done
    local more=""; [ "$n" -gt "$H" ] && more="   ${D}$((cur + 1))/$n${N}"
    local go="enter = continue with $cnt"; [ "$cnt" -eq 0 ] && go="enter = take just this file"
    printf '  %sspace = tick/untick · a = all/none · %s · esc = cancel%s%s\e[K\n' "$D" "$go" "$N" "$more"
    readkey
    case "$KEY" in
      up)   cur=$(((cur - 1 + n) % n)) ;;
      down) cur=$(((cur + 1) % n)) ;;
      space) [ "${_sl[cur]}" = 1 ] && _sl[cur]=0 || _sl[cur]=1 ;;
      a)    if [ "$cnt" -eq "$n" ]; then for i in "${!_sl[@]}"; do _sl[i]=0; done; else for i in "${!_sl[@]}"; do _sl[i]=1; done; fi ;;
      enter) if [ "$cnt" -eq 0 ]; then _sl[cur]=1; cnt=1; fi; break ;; # nothing ticked: enter takes the highlighted file
      esc|q) printf '\e[%dA\e[J' $((H + 2)); show; return 1 ;;
    esac
    [ "$cur" -lt "$top" ] && top=$cur
    [ "$cur" -ge $((top + H)) ] && top=$((cur - H + 1))
    printf '\e[%dA' $((H + 2))
  done
  printf '\e[%dA\e[J' $((H + 2))
  printf '  %s✔%s %s %s%d file(s)%s\n' "$G" "$N" "$title" "$B" "$cnt" "$N"
  show
}

ask_line() { # ask_line VAR "prompt" [prefill]  (readline editing)
  local __v __p; show
  # \001 … \002 mark the colour codes as zero-width; without them readline miscounts the prompt and long
  # input wraps and redraws in the wrong place (garbled text in a narrow terminal).
  printf -v __p '  \001%s\002❯\001%s\002 %s' "$C" "$N" "$2"
  read -e -r -i "${3:-}" -p "$__p" __v || die "No input (is this a terminal?)"
  printf -v "$1" '%s' "$__v"
}

# ── repo helpers ─────────────────────────────────────────────────────────────
unpushed_count() {
  if git rev-parse -q --verify '@{u}' >/dev/null 2>&1; then git rev-list --count '@{u}..HEAD'
  else git rev-list --count HEAD --not --remotes 2>/dev/null || echo 0; fi
}
health_check() {
  local gd f; gd=$(git rev-parse --git-dir) || { echo "not a git repository"; return 1; }
  git switch -h >/dev/null 2>&1; [ $? -eq 129 ] || { echo "this Git is too old (needs 2.23+ for 'git switch') — update Git for Windows"; return 1; }
  [ -e "$gd/index.lock" ] && { echo "git's index is locked ($gd/index.lock) — another git process is running, or one crashed. If none is running, delete that file."; return 1; }
  for f in CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    [ -e "$gd/$f" ] && { echo "a rebase / cherry-pick / revert is in progress ($f) — finish or abort it first"; return 1; }
  done
  # A file git still lists as conflicted but that has no <<<<<<< markers left is FIXED — it only needs staging,
  # which pnpm stage does. Only files that still contain markers block the tools.
  local c u=""; while IFS= read -r f; do [ -n "$f" ] && grep -q '^<<<<<<< ' "$f" 2>/dev/null && u+="$f"$'\n'; done < <(git diff --name-only --diff-filter=U)
  [ -z "$u" ] || { echo "unresolved merge conflicts — open each file, remove the <<<<<<< ======= >>>>>>> lines, save, then run pnpm stage:"; printf '%s' "$u"; echo "(or undo the whole merge: git merge --abort)"; return 1; }
  [ -d node_modules ] || { echo "dependencies missing — run: $PM install"; return 1; }
  git remote get-url origin >/dev/null 2>&1 || { echo "no 'origin' remote configured — run: git remote add origin <url>"; return 1; }
  { git config user.name && git config user.email; } >/dev/null 2>&1 || { echo "git identity not set — run: git config --global user.name 'Your Name'  and  git config --global user.email you@example.com"; return 1; }
}
left_as_is() { # what is still in place after stopping early
  local st up; st=$(git diff --cached --name-only | wc -l | tr -d ' '); up=$(unpushed_count)
  echo
  [ "$st" -gt 0 ] && note "  $st file(s) stay staged."
  [ "$up" -gt 0 ] && note "  $up commit(s) not pushed yet."
  note "  Run pnpm push whenever you want to continue."
}


# begin "title" [nohealth] — the shared start of every tool: checks, banner, repo health.
begin() {
  TITLE=$1
  command -v git >/dev/null || die "git is not installed."
  [ -d "$ROOT/.git" ] || die "$ROOT is not a git repository."
  cd "$ROOT" || die "Cannot enter $ROOT"
  banner; printf '  %s%s%s   %s⎇ %s%s\n' "$B$M" "$NAME" "$N" "$D" "$(git branch --show-current)" "$N"
  if [ "${2:-}" != nohealth ]; then
    step "Health"
    spin "Checking repository" health_check || { showlog 15; die "Fix the above, then run again."; }
  fi
}
