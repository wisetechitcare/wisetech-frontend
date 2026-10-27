#!/usr/bin/env bash
# Commit what is staged — nothing else.   Run: pnpm commit   (or: bash devtools/commit.sh)
# Runs the checks, asks for type / scope / description, and commits as soon as you enter the
# description. It never stages (pnpm gstage does) and never pushes (pnpm push does).

DEVTOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$DEVTOOLS_DIR/lib/select.sh"

# ── checks ───────────────────────────────────────────────────────────────────
guard_scan() { [ ${#STAGED[@]} -eq 0 ] || [ ! -f scripts/hooks/guard.mjs ] || node scripts/hooks/guard.mjs "${STAGED[@]}"; }
typecheck()  { grep -q '"type-check"' package.json || { echo "no type-check script in package.json"; return 0; }; $PM run -s type-check; }
prisma_check() { npx --no-install prisma validate; }
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

phase_commit() {
  local STAGED=()
  mapfile -d '' -t STAGED < <(git diff --cached --name-only --diff-filter=ACM -z)

  step "2 · Checks"
  run_check "Scanning for secrets, conflict markers, debugger, .only" guard_scan || return 1
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
  if [ "$NAME" = "wisetech-backend" ] && printf '%s\n' "${STAGED[@]}" | grep -qx 'prisma/schema.prisma'; then
    run_check "Validating Prisma schema" prisma_check || return 1
    if ! git diff --cached --name-only | grep -q '^prisma/migrations/'; then
      warn "schema.prisma changed with no migration in this commit — the pre-push hook and CI reject drift"
      local o3=("Continue anyway" "Stop — I'll create a migration"); menu "Migration" o3 || return 1
      [ "$MENU_IDX" -eq 0 ] || return 1
    fi
  fi
  if [ "${SKIP_TYPECHECK:-0}" = 1 ]; then warn "type-check skipped (SKIP_TYPECHECK=1) — the pre-push hook still runs it"
  else run_check "Type-checking (can take a minute)" typecheck 1 || return 1; fi

  step "3 · Commit message"
  local ctype="" scope="" desc="" stage=type known=()
  mapfile -t known < <(scope_candidates)
  # type -> scope -> description. Esc (or an empty line at the description) steps back; q quits where it
  # can't be a typed character; Ctrl+C quits anywhere. Entering the description makes the commit.
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
        ask_line desc "Description (≤100 chars, no trailing period; empty + enter = back): " "$desc"
        _scope_trim "$desc"; desc=$TRIMMED
        if [ -z "$desc" ]; then stage=scope
        elif [ ${#desc} -gt 100 ]; then warn "${#desc} characters — max 100"
        elif [[ $desc == *. ]]; then warn "must not end with a period"
        else break; fi ;;
    esac
  done
  MSG=$(build_commit_msg "$ctype" "$scope" "$desc")

  ensure_work_branch || return 1
  echo
  spin "Committing (hooks running)" commit_it || { showlog 40; explain_git_error; warn "The commit didn't go through — your files stay staged. Fix the above and run pnpm push again."; return 1; }
  ok "committed: ${B}$MSG${N}"
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
