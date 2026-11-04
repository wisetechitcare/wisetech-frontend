#!/usr/bin/env bash
# Stage files — nothing else.   Run: pnpm gstage   (pnpm run stage and bash devtools/stage.sh work too;
# plain "pnpm stage" is a built-in pnpm command, so it never reaches this script).
# Lists what changed, then stages everything or the files you pick. Staged files stay staged
# whatever you do next; commit them with pnpm commit.

DEVTOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$DEVTOOLS_DIR/lib/common.sh"

# ── phase 1 · stage ──────────────────────────────────────────────────────────
# Lists the changes and stages what you choose, immediately. Returns 1 to stop (nothing is lost).
phase_stage() {
  step "1 · Stage"
  local paths=() codes=() rec nstaged=0
  while IFS= read -r -d '' rec; do codes+=("${rec:0:2}"); paths+=("${rec:3}"); done \
    < <(git status --porcelain=v1 -z -uall --no-renames)

  # +added/−removed per file, for tracked and (small) untracked files
  declare -A NUM=(); local a d p line
  while IFS= read -r line; do
    IFS=$'\t' read -r a d p <<<"$line"; [ -n "$p" ] && NUM["$p"]="${G}+${a}${N} ${R}-${d}${N}"
  done < <(git diff HEAD --numstat --no-renames 2>/dev/null)
  local labels=() sel=() i letter col
  for i in "${!paths[@]}"; do
    p=${paths[i]}
    case "${codes[i]}" in
      '??') letter="N"; col=$G; if [ -z "${NUM[$p]:-}" ] && [ -f "$p" ] && [ "$i" -lt 150 ]; then NUM["$p"]="${G}+$(wc -l <"$p" | tr -d ' ')${N}"; fi ;;
      *D*) letter="D"; col=$R ;;
      A*) letter="A"; col=$G ;;
      *) letter="M"; col=$Y ;;
    esac
    labels+=("${col}${letter}${N}  $(trunc "$p" $((COLS - 26)))  ${NUM[$p]:-}")
    case "${codes[i]:0:1}" in ' '|'?') sel+=(0) ;; *) sel+=(1); nstaged=$((nstaged + 1)) ;; esac
  done
  printf '  %s%d changed file(s)%s   %sN new · M modified · A added · D deleted%s\n\n' "$B" "${#paths[@]}" "$N" "$D" "$N"

  local o=() acts=()
  if [ "$nstaged" -gt 0 ]; then o+=("Use what's already staged ($nstaged file(s))"); acts+=(keep); fi
  if [ -e "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then   # a merge commit takes everything — no partial picks
    note "  A merge is in progress: staging also marks your fixed conflicts as resolved."
    o+=("Stage everything" "Cancel"); acts+=(all cancel)
  else o+=("Stage everything" "Choose files…" "Cancel"); acts+=(all pick cancel); fi
  menu "What goes in this commit?" o || return 1
  case "${acts[MENU_IDX]}" in
    keep) ;;
    all)  spin "Staging all changes" git add -A || { showlog; warn "git add failed"; return 1; } ;;
    pick) checklist "Pick files" labels sel || return 1
          local pick=(); for i in "${!sel[@]}"; do [ "${sel[i]}" = 1 ] && pick+=("${paths[i]}"); done
          git reset -q # the commit holds exactly the selection
          spin "Staging ${#pick[@]} file(s)" git add -A -- "${pick[@]}" || { showlog; warn "git add failed"; return 1; } ;;
    *)    return 1 ;;
  esac
  git diff --cached --quiet && { warn "Nothing is staged — the files you picked may be ignored by .gitignore."; return 1; }
  ok "$(git diff --cached --name-only | wc -l | tr -d ' ') file(s) staged — they stay staged whatever happens next"
}


if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  begin "stage"
  if [ -z "$(git status --porcelain -uall)" ]; then ok "working tree clean — nothing to stage"; exit 0; fi
  phase_stage || { left_as_is; exit 0; }
  echo; note "  Next: pnpm commit  (or pnpm push to commit and push in one go)"; echo
fi
