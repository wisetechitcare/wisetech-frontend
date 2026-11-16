#!/usr/bin/env bash
# Pull the latest changes into the current branch.   Run: pnpm pull   (or: bash devtools/pull.sh)
#
# Pulls from this branch's remote copy, origin/main, origin/dev, or any other branch on origin
# (the same picker as pnpm push's "another branch"; you choose). With uncommitted
# changes it offers to stage and commit them first (never pushing), then pulls.

DEVTOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$DEVTOOLS_DIR/stage.sh"
source "$DEVTOOLS_DIR/commit.sh"

# ── pull ─────────────────────────────────────────────────────────────────────
tool_pull() {
  local b gd f; b=$(git branch --show-current); gd=$(git rev-parse --git-dir)
  [ -n "$b" ] || { warn "detached HEAD — switch to a branch first"; return; }
  step "Pull into $b"
  git remote get-url origin >/dev/null 2>&1 || { bad "no 'origin' remote configured — run: git remote add origin <url>"; return; }
  [ -e "$gd/index.lock" ] && { bad "git's index is locked — another git process is running, or one crashed. If none is, delete $gd/index.lock"; return; }
  if [ -e "$gd/MERGE_HEAD" ]; then
    bad "a merge is already in progress"
    note "  Finish it: fix the conflicted files, 'git add' them, then run pnpm push.   Undo it: git merge --abort"; return
  fi
  for f in rebase-merge rebase-apply CHERRY_PICK_HEAD REVERT_HEAD; do
    [ -e "$gd/$f" ] && { bad "a rebase / cherry-pick / revert is in progress — finish or abort it first"; return; }
  done
  { git config user.name && git config user.email; } >/dev/null 2>&1 || { bad "git identity not set — git config --global user.name 'Your Name' and user.email you@example.com"; return; }

  if ! { git diff --quiet && git diff --cached --quiet; }; then
    warn "you have uncommitted changes — a pull needs them committed first"
    local d=("Stage & commit them now (no push), then pull" "Cancel")
    menu "Uncommitted changes" d || return
    [ "$MENU_IDX" -eq 0 ] || return
    local before; before=$(git rev-parse HEAD 2>/dev/null)
    COMMIT_ONLY=1; phase_stage && phase_commit; COMMIT_ONLY=0   # stage + commit, never push
    if [ "$(git rev-parse HEAD 2>/dev/null)" = "$before" ]; then left_as_is; warn "no commit was made — pull cancelled"; return; fi
    banner; printf '  %s%s%s   %s⎇ %s%s\n' "$B$M" "$(basename "$ROOT")" "$N" "$D" "$b" "$N"
    step "Pull into $b"
    git diff --quiet && git diff --cached --quiet || warn "some files are still uncommitted — the pull only fails if it touches them"
  fi

  spin "Fetching origin" git fetch -q origin || { showlog 8; explain_git_error; return; }
  # Where to pull from: this branch's own remote copy (if any), then main and dev.
  local src=() r
  if git rev-parse -q --verify '@{u}' >/dev/null 2>&1; then src+=("$(git rev-parse --abbrev-ref '@{u}' | sed 's#^origin/##')")
  elif git rev-parse -q --verify "origin/$b" >/dev/null; then src+=("$b"); fi
  for r in main dev; do
    git rev-parse -q --verify "origin/$r" >/dev/null && [ "$r" != "$b" ] && [[ " ${src[*]:-} " != *" $r "* ]] && src+=("$r")
  done
  local items=() tag; for r in "${src[@]}"; do
    tag=""; [ "$r" = "$b" ] && tag="  ${D}← your current branch${N}"
    items+=("origin/$r$tag")
  done
  items+=("Pull from another branch… (pick any branch on origin)" "← Back")
  while :; do
    menu "Pull into $b from" items || return
    if [ "$MENU_IDX" -lt ${#src[@]} ]; then r=${src[MENU_IDX]}; break; fi
    [ "$MENU_IDX" -eq $((${#src[@]} + 1)) ] && return                   # ← Back
    branch_select "$b" existing                                          # same picker as pnpm push, origin branches only
    case "$BRANCH_ACTION" in
      pick) r=$BRANCH_RESULT; break ;;
      back) continue ;;                                                  # back to the pull menu
      *) return ;;
    esac
  done
  if spin "Pulling origin/$r into $b" git pull --no-rebase --no-edit origin "$r"; then
    sed 's/\x1b\[[0-9;?]*[a-zA-Z]//g' "$LOG" | tail -n 8 | sed 's/^/    /'
    echo; ok "done"
  else
    local conflicts; conflicts=$(git diff --name-only --diff-filter=U)
    if [ -n "$conflicts" ]; then
      printf '\n  %sMerge conflicts in:%s\n' "$Y" "$N"; printf '%s\n' "$conflicts" | sed 's/^/    /'
      local co=("Leave them — I'll resolve them" "Abort the merge (undo this pull)")
      menu "Conflicts" co || return
      if [ "$MENU_IDX" -eq 1 ]; then spin "Aborting the merge" git merge --abort && ok "back to how it was before the pull" || showlog 10
      else note "  Fix each file, 'git add' it, then run pnpm push to finish the merge."; fi
    else
      showlog 25; explain_git_error
    fi
  fi
}

# ── main ─────────────────────────────────────────────────────────────────────
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  begin "pull latest" nohealth
  tool_pull
  echo
fi
