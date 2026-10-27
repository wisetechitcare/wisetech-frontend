#!/usr/bin/env bash
# Guided stage → commit → push.   Run: pnpm push   (or: bash devtools/push.sh)
#
# The same three phases that pnpm gstage / pnpm commit run on their own, one after another. Each
# finishes by itself: quit at the commit message and your staged files stay staged; skip the push
# and your commit stays committed. Run pnpm push again to carry on from wherever you stopped.
# The checks are the repo's own git hooks, run by git itself: pre-commit + commit-msg when the commit is
# made, pre-push (protected branches, type-check, migration drift) when it is pushed. These scripts add no
# checks of their own and never skip a hook — to bypass one, run git with --no-verify yourself.

DEVTOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$DEVTOOLS_DIR/stage.sh"
source "$DEVTOOLS_DIR/commit.sh"
TITLE="commit & push"

push_it()    { if [ -n "${PUSH_REFSPEC:-}" ]; then git push origin "$PUSH_REFSPEC"; else git push -u origin "$TARGET"; fi; }

# ── phase 3 · push ───────────────────────────────────────────────────────────
# Optional, and separate: a commit that isn't pushed stays committed; pnpm push offers it again.
phase_push() {
  local up; up=$(unpushed_count); [ "$up" -gt 0 ] || return 0
  local cur; cur=$(git branch --show-current)
  step "4 · Push"
  printf '  %s%d local commit(s) not on origin yet:%s\n' "$Y" "$up" "$N"
  git log --oneline -n 5 --not --remotes | sed "s/^/    ${D}/; s/\$/${N}/"
  local items=() acts=() choice target=""
  while :; do
    items=(); acts=()
    if [ -n "$cur" ] && [[ $PROTECTED != *" $cur "* ]]; then items+=("Push $cur to origin"); acts+=(cur); fi
    items+=("Push to another branch… (pick one, or type a new name)" "Not now — keep it committed locally"); acts+=(other later)
    menu "Push" items || { PUSH_RESULT=later; return 0; }
    choice=${acts[MENU_IDX]}
    case "$choice" in
      later) PUSH_RESULT=later; return 0 ;;
      cur)   target=$cur; break ;;
      other) branch_select "$cur"
             case "$BRANCH_ACTION" in
               pick|create)
                 target=$BRANCH_RESULT
                 git check-ref-format --branch "$target" >/dev/null 2>&1 || { warn "'$target' is not a valid branch name"; continue; }
                 break ;;
               back) continue ;;                          # back to the push menu
               *) PUSH_RESULT=later; return 0 ;;
             esac ;;
    esac
  done
  # Another branch is pushed by refspec (HEAD -> origin/<name>); your local branch and its upstream stay as they are.
  PUSH_REFSPEC=""; [ "$target" != "$cur" ] && PUSH_REFSPEC="HEAD:refs/heads/$target"
  if git rev-parse -q --verify "origin/$target" >/dev/null; then
    local behind; behind=$(git rev-list --count "HEAD..origin/$target")
    if [ "$behind" -gt 0 ]; then
      warn "origin/$target has $behind commit(s) you don't have, so a push would be rejected."
      note "  Your commit is safe. Run pnpm pull (pick origin/$target), then pnpm push."; PUSH_RESULT=later; return 0
    fi
  fi
  TARGET=$target
  if spin "Pushing to origin/$target (the pre-push hook checks first)" push_it; then PUSH_RESULT=$target
  else showlog 40; explain_git_error; warn "Your commit is safe locally. Fix the above, then run pnpm push again."; PUSH_RESULT=later; fi
}

# ── one repo, start to finish ────────────────────────────────────────────────
PUSH_RESULT=""; TARGET=""; PUSH_REFSPEC=""
process_repo() {
  NAME=$1; local t0=$SECONDS
  cd "$ROOT" || die "Cannot enter $ROOT"
  PM=npm; command -v pnpm >/dev/null && [ -f pnpm-lock.yaml ] && PM=pnpm
  banner; printf '  %s%s%s\n' "$B$M" "$NAME" "$N"

  step "Health"
  spin "Checking repository" health_check || { showlog 15; die "Fix the above, then run again."; }
  local current; current=$(git branch --show-current)
  if [ -n "$current" ]; then ok "on branch ${B}${current}${N}"; else warn "detached HEAD"; fi
  if spin "Fetching origin" git fetch -q origin; then
    if [ -n "$current" ] && git rev-parse -q --verify "origin/$current" >/dev/null; then
      local behind ahead; read -r behind ahead < <(git rev-list --left-right --count "origin/$current...HEAD")
      [ "$behind" -gt 0 ] && warn "origin/$current has $behind commit(s) you don't — run pnpm pull before pushing"
      [ "$ahead" -gt 0 ] && note "  $ahead local commit(s) not pushed yet"
    fi
  else warn "origin unreachable — continuing offline (a push will fail)"; fi

  # A merge whose conflicts are all resolved still needs its commit — make it right away.
  if [ -e "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then
    warn "a merge is waiting to be committed (all conflicts are resolved)"
    spin "Committing the merge (hooks running)" git commit --no-edit || { showlog 30; explain_git_error; die "Merge commit failed. Fix the above and run again."; }
  fi

  local committed=0 changed; PUSH_RESULT=""
  changed=$(git status --porcelain -uall | wc -l | tr -d ' ')
  if [ "$changed" -gt 0 ]; then
    phase_stage  || { left_as_is; return 0; }
    phase_commit || { left_as_is; return 0; }
    committed=1
  else
    ok "working tree clean"
  fi
  if [ "$COMMIT_ONLY" != 1 ]; then phase_push; fi

  if [ "$committed" -eq 0 ] && [ -z "$PUSH_RESULT" ]; then
    [ "$(unpushed_count)" -gt 0 ] && left_as_is || note "  nothing to commit or push"
    return 0
  fi

  # ── done ──
  local url what; url=$(git remote get-url origin | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')
  if [ -n "$PUSH_RESULT" ] && [ "$PUSH_RESULT" != later ]; then what="Pushed"; elif [ "$committed" -eq 1 ]; then what="Committed"; else what="Done"; fi
  printf '\n  %s╭──────────────────────────────────────────────╮%s\n' "$G" "$N"
  printf '  %s│%s  %s✔ %s %s in %ds%s\n' "$G" "$N" "$B" "$what" "$NAME" $((SECONDS - t0)) "$N"
  printf '  %s╰──────────────────────────────────────────────╯%s\n' "$G" "$N"
  printf '  %s\n' "$(git log --oneline -n 1)"
  if [ -n "$PUSH_RESULT" ] && [ "$PUSH_RESULT" != later ]; then
    case "$url" in https://github.com/*) printf '  %sPull request:%s %s/compare/%s?expand=1\n' "$D" "$N" "$url" "$PUSH_RESULT" ;; esac
  elif [ "$COMMIT_ONLY" != 1 ]; then note "  Not pushed — run pnpm push when you're ready."; fi
  echo
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  command -v git >/dev/null || die "git is not installed."
  [ -d "$ROOT/.git" ] || die "$ROOT is not a git repository."
  process_repo "$NAME"
fi
