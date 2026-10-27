#!/usr/bin/env bash
# Commit what is staged — nothing else.   Run: pnpm commit   (or: bash devtools/commit.sh)
# Asks for type / scope / description and commits as soon as you enter the description. It never
# stages (pnpm gstage does) and never pushes (pnpm push does). The checks are the repo's own git hooks
# (.husky/pre-commit and commit-msg), which run inside the commit — nothing is duplicated here.

DEVTOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$DEVTOOLS_DIR/lib/select.sh"

# ── commit ───────────────────────────────────────────────────────────────────
commit_it()  { git commit -m "$MSG"; }

# ── phase 2 · commit ─────────────────────────────────────────────────────────
# A commit made from a protected branch can never be pushed, so move the work onto its own branch first.
ensure_work_branch() {
  [ "$COMMIT_ONLY" = 1 ] && return 0
  local cur; cur=$(git branch --show-current)
  [ -n "$cur" ] && [[ $PROTECTED != *" $cur "* ]] && return 0
  if [ -z "$cur" ]; then warn "detached HEAD — this work needs a branch"; else warn "'$cur' is protected — this work needs its own branch to be pushable"; fi
  local o=("Create a new branch now") acts=(new)
  if [ -n "$cur" ]; then o+=("Commit on $cur anyway (it can't be pushed from there)"); acts+=(stay); fi
  o+=("Cancel"); acts+=(cancel)
  menu "Branch" o || return 1
  case "${acts[MENU_IDX]}" in
    stay) return 0 ;;
    new)  local nb
          while :; do
            ask_line nb "New branch name (e.g. feature/billing-tabs; empty = cancel): "
            [ -n "$nb" ] || return 1
            git check-ref-format --branch "$nb" >/dev/null 2>&1 || { warn "'$nb' is not a valid branch name"; continue; }
            case "$PROTECTED" in *" $nb "*) warn "'$nb' is protected"; continue ;; esac
            break
          done
          spin "Creating branch $nb" git switch -c "$nb" || { showlog 12; explain_git_error; return 1; } ;;
    *)    return 1 ;;
  esac
}

# ── the hooks are the single source of truth ─────────────────────────────────
# pre-commit (secret / hygiene scan of the staged files) and commit-msg (message format) run inside
# `git commit` below; pre-push (protected branches, type-check, migration drift) runs inside `git push`.
# Nothing in these scripts repeats those checks. The one thing asked up front is the commit-msg
# hook's own validator, so a message the hook would refuse is caught while you are still typing it.
hook_msg_error() { # prints the commit-msg hook's complaint; fails when the message is not acceptable
  [ -f "$ROOT/scripts/hooks/guard.mjs" ] || return 0
  local f out rc; f=$(mktemp); TMPS+=("$f"); printf '%s\n' "$1" >"$f"
  out=$(node "$ROOT/scripts/hooks/guard.mjs" --commit-msg "$f" 2>&1); rc=$?
  rm -f "$f"
  [ "$rc" -eq 0 ] || printf '%s\n' "$out"
  return "$rc"
}

phase_commit() {
  step "2 · Commit"
  # Not a gate — just saves a CI failure: CI installs with --frozen-lockfile.
  if git diff --cached --name-only | grep -qx 'package.json' && ! git diff --cached --name-only | grep -qx 'pnpm-lock.yaml'; then
    warn "package.json changed but pnpm-lock.yaml did not (CI installs with --frozen-lockfile)"
    local o2=("Run $PM install now, then continue" "Continue anyway" "Cancel")
    menu "Lockfile" o2 || return 1
    case "$MENU_IDX" in
      0) spin "Running $PM install" $PM install || { showlog 25; warn "$PM install failed — your files stay staged."; return 1; }
         if git diff --quiet -- pnpm-lock.yaml 2>/dev/null; then note "  lockfile already up to date"
         else git add pnpm-lock.yaml && ok "pnpm-lock.yaml updated and staged"; fi ;;
      1) ;;
      *) return 1 ;;
    esac
  fi

  local ctype="" scope="" desc="" stage=type known=() err rc
  mapfile -t known < <(scope_candidates)
  # type -> scope -> description -> commit. Esc (or an empty line at the description) steps back; q quits
  # where it can't be a typed character; Ctrl+C quits anywhere. Entering a valid description commits.
  while :; do
    case "$stage" in
      type)
        type_select
        case "$TYPE_ACTION" in
          pick) ctype=$TYPE_RESULT; stage=scope ;;
          *) return 1 ;;                         # back / q / end of input: nothing earlier to return to
        esac ;;
      scope)
        scope_select known
        case "$SCOPE_ACTION" in
          pick) scope=$SCOPE_RESULT; stage=desc ;;
          none) scope=""; stage=desc ;;
          back) stage=type ;;
          *) return 1 ;;
        esac ;;
      desc)
        TEXT_PREFILL=$desc
        text_input "Description" "up to 100 characters, no trailing period" 100
        case "$TEXT_ACTION" in
          submit) desc=$TEXT_RESULT ;;
          back)   stage=scope; continue ;;
          *)      return 1 ;;
        esac
        MSG=$(build_commit_msg "$ctype" "$scope" "$desc")
        if err=$(hook_msg_error "$MSG"); then stage=commit
        else warn "the commit-msg hook would refuse this:"; printf '%s\n' "$err" | sed 's/^/    /'; fi ;;
      commit)
        ensure_work_branch || return 1
        echo
        if spin "Committing (pre-commit and commit-msg hooks run)" commit_it; then
          ok "committed: ${B}$MSG${N}"; return 0
        fi
        showlog 40; explain_git_error
        local ro=("Retry with the same message" "Change the message" "Stop — files stay staged")
        menu "The commit was stopped" ro || return 1
        case "$MENU_IDX" in 0) ;; 1) stage=desc ;; *) return 1 ;; esac ;;
    esac
  done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  begin "commit"
  if git diff --cached --quiet; then
    if [ -n "$(git status --porcelain -uall)" ]; then warn "Nothing is staged — run pnpm gstage first."; else ok "working tree clean — nothing to commit"; fi
    exit 0
  fi
  ok "$(git diff --cached --name-only | wc -l | tr -d ' ') file(s) staged"
  phase_commit || { left_as_is; exit 0; }
  echo; note "  Next: pnpm push"; echo
fi
