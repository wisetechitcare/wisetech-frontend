#!/usr/bin/env bash
# Searchable pickers for the commit message (type and scope) and the pure helpers behind them.
# Unit-tested by devtools/push.test.sh. Sourced, never run directly.

# shellcheck disable=SC1090
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[ -n "${DEVTOOLS_SELECT:-}" ] && return 0
DEVTOOLS_SELECT=1

COMMIT_TYPES=(feat fix refactor perf style docs test build ci chore revert)
COMMIT_HINTS=("a new feature" "a bug fix" "restructure, same behaviour" "performance" "formatting / UI polish" "documentation" "tests" "build / dependencies" "CI config" "maintenance" "revert a commit")
COMMIT_ICONS=("✨" "🐛" "♻️ " "⚡" "💄" "📝" "✅" "📦" "🤖" "🔧" "⏪")

# ── searchable lists: pure helpers (unit-tested in devtools/push.test.sh) ──────
# The _underscore variants fill a global instead of printing, so the prompt can call them on every
# keystroke without forking a subshell (slow on Windows). The plain versions wrap them for callers/tests.
_scope_trim() { local s=$1; s=${s#"${s%%[![:space:]]*}"}; TRIMMED=${s%"${s##*[![:space:]]}"}; }
scope_trim() { _scope_trim "$1"; printf '%s' "$TRIMMED"; }

# Same character set the commit-msg hook accepts inside the parentheses (scripts/hooks/guard.mjs).
SCOPE_CHARS='A-Za-z0-9 ._,/-'
scope_char_ok() { case "$1" in [A-Za-z0-9]|' '|.|_|,|/|-) return 0 ;; *) return 1 ;; esac; }
scope_valid() { # trimmed, non-empty, only permitted characters
  local re="^[$SCOPE_CHARS]+\$"; _scope_trim "$1"
  [ -n "$TRIMMED" ] && [[ $TRIMMED =~ $re ]]
}

# Scopes used in recent commits, most-used first, unique ignoring case (the newest commit's spelling wins).
scope_candidates() {
  git log -n 500 --format=%s 2>/dev/null | sed -nE 's/^[a-z]+\(([^)]+)\)!?:.*/\1/p' |
    awk '{ k = tolower($0); c[k]++; if (!(k in n)) n[k] = $0 } END { for (k in c) printf "%d\t%s\n", c[k], n[k] }' |
    sort -t$'\t' -k1,1nr -k2,2 | cut -f2-
}

# scope_filter QUERY item…  → matches, best first: exact, then prefix, then substring (ignoring case).
# Canonical spelling is preserved; an empty query returns everything in the given order.
_scope_filter() { # fills FILTERED
  local q=${1,,}; shift
  local s l ex=() pre=() sub=(); FILTERED=()
  if [ -z "$q" ]; then FILTERED=("$@"); return 0; fi
  for s in "$@"; do
    l=${s,,}
    if [ "$l" = "$q" ]; then ex+=("$s")
    elif [[ $l == "$q"* ]]; then pre+=("$s")
    elif [[ $l == *"$q"* ]]; then sub+=("$s"); fi
  done
  FILTERED=("${ex[@]}" "${pre[@]}" "${sub[@]}")
}
scope_filter() { _scope_filter "$@"; [ ${#FILTERED[@]} -gt 0 ] && printf '%s\n' "${FILTERED[@]}"; return 0; }

# scope_exact QUERY item…  → the existing item equal to QUERY ignoring case, if any.
_scope_exact() { # sets EXACT
  local q=${1,,} s; shift; EXACT=""
  for s in "$@"; do [ "${s,,}" = "$q" ] && { EXACT=$s; return 0; }; done
  return 1
}
scope_exact() { _scope_exact "$@" && printf '%s' "$EXACT"; }

# scope_rows QUERY item…  → the rows a list shows, one "kind<TAB>value" per line:
#   empty query : every item (kind "scope"), then "none" and "back"
#   typed query : the matches (kind "scope"), then a "create" row — unless the query already IS an item
_scope_rows() { # fills ROWS
  local tq k; _scope_trim "$1"; tq=$TRIMMED; shift; ROWS=()
  if [ -z "$tq" ]; then
    for k in "$@"; do ROWS+=("scope"$'\t'"$k"); done
    ROWS+=("none"$'\t' "back"$'\t')
    return 0
  fi
  _scope_filter "$tq" "$@"
  for k in "${FILTERED[@]}"; do [ -n "$k" ] && ROWS+=("scope"$'\t'"$k"); done
  if ! _scope_exact "$tq" "$@" && ${LS_VALID:-scope_valid} "$tq"; then ROWS+=("create"$'\t'"$tq"); fi
  return 0
}
scope_rows() { _scope_rows "$@"; [ ${#ROWS[@]} -gt 0 ] && printf '%s\n' "${ROWS[@]}"; return 0; }

# build_commit_msg TYPE SCOPE DESC  → "type(scope): desc", or "type: desc" with no scope (never "type():").
build_commit_msg() {
  local scope; scope=$(scope_trim "${2:-}")
  if [ -n "$scope" ]; then printf '%s(%s): %s' "$1" "$scope" "$3"; else printf '%s: %s' "$1" "$3"; fi
}

# ── keyboard input for a text field ───────────────────────────────────────────
# → KEY: up down enter esc eof bs clear char ignore   (CH holds the character for KEY=char)
readkey_text() {
  local k rest; CH=""
  IFS= read -rsn1 k || { KEY=eof; return; }
  case "$k" in
    $'\e')
      IFS= read -rsn1 -t 0.05 rest || { KEY=esc; return; }   # nothing follows: a lone Esc
      if [ "$rest" = "[" ] || [ "$rest" = "O" ]; then
        IFS= read -rsn1 -t 0.05 rest
        case "$rest" in
          A) KEY=up ;;
          B) KEY=down ;;
          *) KEY=ignore   # left/right/home/end/delete…: swallow the rest of the sequence so it is not typed
             while [[ $rest != [A-Za-z~] ]] && IFS= read -rsn1 -t 0.01 rest; do :; done ;;
        esac
      else KEY=ignore; fi ;;
    '') KEY=enter ;;
    $'\x7f'|$'\b') KEY=bs ;;
    $'\x15') KEY=clear ;;
    *) if [[ $k == [[:print:]] ]]; then KEY=char; CH=$k; else KEY=ignore; fi ;;
  esac
}

# ── list_select: a searchable list with pinned rows ──────────────────────────
# In : LS_TITLE   heading                       LS_ITEMS  items (unique; also the text that is searched)
#      LS_LABEL   assoc item → display text     LS_CREATE 1 = offer  + Create "typed text"
#      LS_NONE    label of a "no value" row     LS_BACK   label of a back row   (empty = no such row)
#      LS_QUIT_Q  1 = "q" on an empty search quits (leave 0 where q must stay typeable)
#      LS_HEIGHT  rows drawn (items + pinned rows)
#      LS_EMPTY_ALL  1 = an empty search lists every item; 0 = only the pinned rows until the user types
# Out: LS_ACTION  pick | create | none | back | quit | cancel      LS_RESULT  the item / typed text
# Esc clears the search first; on an empty search it means "back". Ctrl+C always quits (INT trap).
LS_TITLE=""; LS_ITEMS=(); declare -A LS_LABEL=(); LS_CREATE=0; LS_NONE=""; LS_BACK=""; LS_QUIT_Q=0; LS_HEIGHT=8; LS_EMPTY_ALL=1
# What may be typed / offered as a new entry. Empty = scope rules; branch_select swaps in branch rules.
LS_VALID=""; LS_CHAR_OK=""; LS_CHAR_NOTE=""; LS_CREATE_LABEL=""
LS_ACTION=""; LS_RESULT=""
list_select() {
  local q="" tq sel=0 top=0 i k key val note="" n nitem npin vis label qd more hint escw
  local ikinds=() ivals=() pkinds=()
  local H=$LS_HEIGHT pin=0
  [ -n "$LS_NONE" ] && pin=$((pin + 1)); [ -n "$LS_BACK" ] && pin=$((pin + 1))
  vis=$((H - pin)); [ "$vis" -lt 3 ] && vis=3
  LS_ACTION=""; LS_RESULT=""
  hide
  while :; do
    _scope_trim "$q"; tq=$TRIMMED
    _scope_rows "$tq" "${LS_ITEMS[@]}"
    ikinds=(); ivals=(); pkinds=()
    for k in "${ROWS[@]}"; do
      key=${k%%$'\t'*}; val=${k#*$'\t'}
      case "$key" in
        scope)  # an empty search lists the items only when LS_EMPTY_ALL=1; otherwise suggestions appear as you type
                [ -z "$tq" ] && [ "$LS_EMPTY_ALL" != 1 ] && continue
                ikinds+=(scope); ivals+=("$val") ;;
        create) [ "$LS_CREATE" = 1 ] && { ikinds+=(create); ivals+=("$val"); } ;;
        none)   [ -n "$LS_NONE" ] && pkinds+=(none) ;;
        back)   [ -n "$LS_BACK" ] && pkinds+=(back) ;;
      esac
    done
    nitem=${#ikinds[@]}; npin=${#pkinds[@]}; n=$((nitem + npin))
    [ "$sel" -ge "$n" ] && sel=$((n - 1)); [ "$sel" -lt 0 ] && sel=0
    if [ "$sel" -lt "$nitem" ]; then
      [ "$sel" -lt "$top" ] && top=$sel; [ "$sel" -ge $((top + vis)) ] && top=$((sel - vis + 1))
    fi
    more=$((nitem - vis)); [ "$more" -lt 0 ] && more=0

    # draw: fixed height (title, input, vis item rows, pinned rows, hint) so the cursor can return to the same spot
    printf '  %s%s%s  %s(type to search%s)%s\e[K\n' "$B" "$LS_TITLE" "$N" "$D" "$([ "$LS_CREATE" = 1 ] && echo ' or create')" "$N"
    qd=$q; [ ${#qd} -gt $((COLS - 12)) ] && qd="…${qd: -$((COLS - 13))}"
    printf '  %s❯%s %s%s▏%s\e[K\n' "$C" "$N" "$qd" "$C" "$N"
    for ((i = 0; i < vis; i++)); do
      k=$((top + i))
      if [ "$k" -ge "$nitem" ]; then printf '\e[K\n'; continue; fi
      if [ "${ikinds[k]}" = create ]; then label="${G}${LS_CREATE_LABEL:-+ Create} \"${ivals[k]}\"${N}"; else label=${LS_LABEL[${ivals[k]}]:-${ivals[k]}}; fi
      if [ "$k" -eq "$sel" ]; then printf '  %s❯%s %s%s%s\e[K\n' "$C$B" "$N" "$B" "$label" "$N"; else printf '    %s\e[K\n' "$label"; fi
    done
    for ((i = 0; i < pin; i++)); do
      if [ "$i" -ge "$npin" ]; then printf '\e[K\n'; continue; fi
      k=$((nitem + i))
      if [ "${pkinds[i]}" = none ]; then label=$LS_NONE; else label=$LS_BACK; fi
      if [ "$k" -eq "$sel" ]; then printf '  %s❯%s %s%s%s\e[K\n' "$C$B" "$N" "$B" "$label" "$N"; else printf '    %s%s%s\e[K\n' "$D" "$label" "$N"; fi
    done
    if [ -n "$note" ]; then printf '  %s▲ %s%s\e[K\n' "$Y" "$note" "$N"
    else
      escw=back; [ -n "$q" ] && escw=clear
      hint="↑↓ move · enter select · esc $escw"
      [ "$LS_QUIT_Q" = 1 ] && hint="$hint · q quit" || hint="$hint · ctrl+c quit"
      if [ -z "$tq" ] && [ "$LS_EMPTY_ALL" != 1 ]; then
        if [ ${#LS_ITEMS[@]} -gt 0 ]; then hint="type to see ${#LS_ITEMS[@]} suggestions · $hint"; else hint="no scopes yet — type a name to create one · $hint"; fi
      elif [ -z "$tq" ] && [ "$more" -gt 0 ]; then hint="+$more more — type to search · $hint"; fi
      [ "$nitem" -eq 0 ] && [ -n "$tq" ] && hint="nothing matches · $hint"
      printf '  %s%s%s\e[K\n' "$D" "$hint" "$N"
    fi
    note=""

    readkey_text
    case "$KEY" in
      up)    [ "$n" -gt 0 ] && sel=$(((sel - 1 + n) % n)) ;;
      down)  [ "$n" -gt 0 ] && sel=$(((sel + 1) % n)) ;;
      enter) [ "$n" -gt 0 ] || continue
             if [ "$sel" -lt "$nitem" ]; then
               if [ "${ikinds[sel]}" = create ]; then LS_ACTION=create; else LS_ACTION=pick; fi
               LS_RESULT=${ivals[sel]}
             else LS_ACTION=${pkinds[sel - nitem]}; fi
             break ;;
      esc)   if [ -n "$q" ]; then q=""; sel=0; top=0; else LS_ACTION=back; break; fi ;;
      eof)   LS_ACTION=cancel; break ;;
      clear) q=""; sel=0; top=0 ;;
      bs)    q=${q%?}; sel=0; top=0 ;;
      char)  if [ -z "$q" ] && [ "$CH" = "q" ] && [ "$LS_QUIT_Q" = 1 ]; then LS_ACTION=quit; break
             elif [ -z "$q" ] && [ "$CH" = " " ]; then :   # nothing starts with a space
             elif [ "$LS_CREATE" = 1 ] && ! ${LS_CHAR_OK:-scope_char_ok} "$CH"; then note="'$CH' isn't allowed ${LS_CHAR_NOTE:-in a scope — letters, digits, space . _ , / -}"
             else q+=$CH; sel=0; top=0; fi ;;
    esac
    printf '\e[%dA' $((H + 3))
  done
  printf '\e[%dA\e[J' $((H + 3))
  show
}

# scope_select ARRAY_OF_KNOWN_SCOPES
#   Type to filter, or type a new name and pick "+ Create". SCOPE_ACTION is pick|none|back|cancel and
#   SCOPE_RESULT the scope. Nothing is saved anywhere: a chosen scope only goes into this commit's message.
SCOPE_ACTION=""; SCOPE_RESULT=""
scope_select() {
  local -n _known=$1
  LS_TITLE="Scope"; LS_ITEMS=("${_known[@]}"); LS_LABEL=(); LS_CREATE=1; LS_VALID=""; LS_CHAR_OK=""; LS_CHAR_NOTE=""; LS_CREATE_LABEL=""
  LS_NONE="(no scope)"; LS_BACK="← Back"; LS_QUIT_Q=0; LS_HEIGHT=7; LS_EMPTY_ALL=0
  list_select
  case "$LS_ACTION" in
    pick|create) SCOPE_ACTION=pick; SCOPE_RESULT=$LS_RESULT
                 printf '  %s✔%s Scope %s%s%s\n' "$G" "$N" "$B" "$SCOPE_RESULT" "$N" ;;
    none)        SCOPE_ACTION=none; SCOPE_RESULT=""
                 printf '  %s✔%s Scope %s(no scope)%s\n' "$G" "$N" "$D" "$N" ;;
    *)           SCOPE_ACTION=$LS_ACTION; SCOPE_RESULT="" ;;
  esac
}

# type_select  → TYPE_ACTION (pick|back|quit|cancel) and TYPE_RESULT (feat, fix, …). Typing filters by
#   name or description ("bug" finds fix, "ui" finds style); "q" on an empty search quits.
TYPE_ACTION=""; TYPE_RESULT=""
type_select() {
  local i item
  LS_TITLE="Type"; LS_ITEMS=(); LS_LABEL=(); LS_CREATE=0; LS_VALID=""; LS_CHAR_OK=""; LS_CHAR_NOTE=""; LS_CREATE_LABEL=""
  LS_NONE=""; LS_BACK="← Back"; LS_QUIT_Q=1; LS_HEIGHT=$((${#COMMIT_TYPES[@]} + 1)); LS_EMPTY_ALL=1
  for i in "${!COMMIT_TYPES[@]}"; do
    item="${COMMIT_TYPES[i]} ${COMMIT_HINTS[i]}"
    LS_ITEMS+=("$item")
    LS_LABEL["$item"]=$(printf '%s  %-9s %s%s%s' "${COMMIT_ICONS[i]}" "${COMMIT_TYPES[i]}" "$D" "${COMMIT_HINTS[i]}" "$N")
  done
  list_select
  TYPE_ACTION=$LS_ACTION; TYPE_RESULT=""
  if [ "$LS_ACTION" = pick ]; then
    TYPE_RESULT=${LS_RESULT%% *}
    printf '  %s✔%s Type %s%s%s\n' "$G" "$N" "$B" "$TYPE_RESULT" "$N"
  fi
}

# ── branches: the same searchable list, fed with every local and origin branch ──
branch_char_ok() { case "$1" in [A-Za-z0-9]|.|_|/|-) return 0 ;; *) return 1 ;; esac; }
# Cheap regex-level check (runs on every keystroke); `git check-ref-format` has the last word at the call site.
branch_valid() {
  _scope_trim "$1"; local b=$TRIMMED re='^[A-Za-z0-9._/-]+$'
  [[ $b =~ $re ]] || return 1
  [[ $b == -* || $b == /* || $b == */ || $b == *. || $b == *..* || $b == *//* || $b == *.lock ]] && return 1
  [[ $PROTECTED == *" $b "* ]] && return 1     # never offer to push to main / master / develop
  return 0
}

# branch_candidates → "name<TAB>tag" lines: local and origin branches, newest first, unique, protected ones left out.
branch_candidates() {
  git for-each-ref --sort=-committerdate --format='%(refname)' refs/heads refs/remotes/origin 2>/dev/null |
    awk -v prot="$PROTECTED" '
      /^refs\/heads\//          { n = substr($0, 12); L[n] = 1 }
      /^refs\/remotes\/origin\// { n = substr($0, 21); if (n == "HEAD") next; R[n] = 1 }
      { if (!(n in seen)) { seen[n] = 1; order[++c] = n } }
      END {
        for (i = 1; i <= c; i++) {
          n = order[i]; if (index(prot, " " n " ")) continue
          t = ((n in L) && (n in R)) ? "local + remote" : ((n in L) ? "local only" : "remote only")
          printf "%s\t%s\n", n, t
        }
      }'
}

# branch_select [CURRENT]  → BRANCH_ACTION (pick | create | back | cancel) and BRANCH_RESULT.
#   Lists every branch; typing filters; a name that doesn't exist offers "+ New branch".
BRANCH_ACTION=""; BRANCH_RESULT=""
branch_select() {
  local cur=${1:-} name tag mark
  LS_TITLE="Branch"; LS_ITEMS=(); LS_LABEL=(); LS_CREATE=1; LS_NONE=""; LS_BACK="← Back"; LS_QUIT_Q=0
  LS_HEIGHT=10; LS_EMPTY_ALL=1; LS_VALID=branch_valid; LS_CHAR_OK=branch_char_ok
  LS_CHAR_NOTE="in a branch name — letters, digits and / - _ ."; LS_CREATE_LABEL="+ New branch"
  while IFS=$'\t' read -r name tag; do
    [ -n "$name" ] || continue
    mark=""; [ "$name" = "$cur" ] && mark=" · current branch"
    LS_ITEMS+=("$name"); LS_LABEL["$name"]="$name  ${D}${tag}${mark}${N}"
  done < <(branch_candidates)
  list_select
  BRANCH_ACTION=$LS_ACTION; BRANCH_RESULT=""
  case "$LS_ACTION" in
    pick|create) BRANCH_RESULT=$LS_RESULT; printf '  %s✔%s Branch %s%s%s\n' "$G" "$N" "$B" "$BRANCH_RESULT" "$N" ;;
  esac
  LS_VALID=""; LS_CHAR_OK=""; LS_CHAR_NOTE=""; LS_CREATE_LABEL=""
}
