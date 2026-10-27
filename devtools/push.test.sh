#!/usr/bin/env bash
# Tests for the commit type/scope pickers and the message builder in devtools/lib/select.sh.
#   Run: pnpm push:test   (or: bash devtools/push.test.sh)
# Plain bash on purpose — these tools have no other test runner, and this needs only git and node.

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
export DEVTOOLS_ALLOW_PIPE=1
# shellcheck disable=SC1091
source devtools/lib/select.sh

pass=0; fail=0
eq() { # eq "name" expected actual
  if [ "$2" = "$3" ]; then pass=$((pass + 1)); else fail=$((fail + 1)); printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$1" "$2" "$3"; fi
}
ok_() { # ok_ "name" command…  — passes when the command succeeds
  local n=$1; shift
  if "$@"; then pass=$((pass + 1)); else fail=$((fail + 1)); printf 'FAIL  %s\n' "$n"; fi
}
no_() { # no_ "name" command…  — passes when the command fails
  local n=$1; shift
  if "$@"; then fail=$((fail + 1)); printf 'FAIL  %s (expected failure)\n' "$n"; else pass=$((pass + 1)); fi
}
join() { local IFS=,; printf '%s' "$*"; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"; cleanup' EXIT

KNOWN=(recruitment approvals security biometric attendance husky docs docker git github)

# Drives scope_select with scripted keystrokes → GOT="action|result". Keys use printf escapes.
sel() { scope_select KNOWN < <(printf "$1") >/dev/null 2>&1; GOT="$SCOPE_ACTION|$SCOPE_RESULT"; }
# sel_esc PRE POST — types PRE, then a lone Esc, then POST. A lone Esc is only an Esc when nothing
# follows it straight away, and redrawing after each key is slow, so the pauses must outlast it.
sel_esc() { scope_select KNOWN < <({ printf "$1"; sleep 1.2; printf '\e'; sleep 1.2; printf "$2"; }) >/dev/null 2>&1; GOT="$SCOPE_ACTION|$SCOPE_RESULT"; }
UP='\e[A'; DOWN='\e[B'; ENTER='\n'; BS='\177'

# ── scope_trim / scope_valid ─────────────────────────────────────────────────
eq "trim both ends"         "docker"  "$(scope_trim '   docker  ')"
eq "trim keeps inner space" "a b"     "$(scope_trim ' a b ')"
eq "trim of blanks is empty" ""       "$(scope_trim '    ')"
ok_ "valid: plain word"     scope_valid "docker"
ok_ "valid: padded"         scope_valid "  docker  "
ok_ "valid: allowed punctuation" scope_valid "api/v2, auth_x.y-z"
no_ "invalid: empty"        scope_valid ""
no_ "invalid: whitespace only" scope_valid "     "
no_ "invalid: parenthesis"  scope_valid "a)b"
no_ "invalid: colon"        scope_valid "a:b"
no_ "invalid: non-ascii"    scope_valid "é"

# ── scope_filter ─────────────────────────────────────────────────────────────
eq "filter: empty query returns all, in order" "$(join "${KNOWN[@]}")" "$(join $(scope_filter '' "${KNOWN[@]}"))"
eq "filter: case-insensitive"                  "docs,docker" "$(join $(scope_filter 'DOC' "${KNOWN[@]}"))"
eq "filter: canonical spelling is kept"        "Docs"        "$(join $(scope_filter 'docs' Docs husky))"
eq "filter: exact first, then prefix"          "git,github"  "$(join $(scope_filter 'git' github git))"
eq "filter: prefix before substring"           "docs,mydocs" "$(join $(scope_filter 'doc' mydocs docs))"
eq "filter: partial match finds docker"        "docker"      "$(join $(scope_filter 'dock' "${KNOWN[@]}"))"
eq "filter: nothing matches"                   ""            "$(join $(scope_filter 'kubernetes' "${KNOWN[@]}"))"
eq "filter: no scopes at all"                  ""            "$(join $(scope_filter 'x'))"
eq "scope_exact is case-insensitive"           "docker"      "$(scope_exact 'DOCKER' "${KNOWN[@]}")"
no_ "scope_exact: no match"                    scope_exact "dock" "${KNOWN[@]}"

# ── scope_rows (what the prompt shows) ───────────────────────────────────────
rows() { scope_rows "$@" | tr '\t\n' ':;' ; }
eq "rows: opening list = all scopes, then no-scope and back" \
   "scope:git;scope:github;none:;back:;" "$(rows '' git github)"
eq "rows: partial match offers create too"  "scope:docs;scope:docker;create:doc;" "$(rows 'doc' docs docker)"
eq "rows: unknown name → only create"       "create:kubernetes;" "$(rows 'kubernetes' "${KNOWN[@]}")"
eq "rows: exact existing match, no create"  "scope:git;scope:github;" "$(rows 'git' git github)"
eq "rows: exact match ignores case, no create" "scope:docker;" "$(rows 'DOCKER' docker)"
eq "rows: query is trimmed"                 "create:docker;" "$(rows '  docker  ')"
eq "rows: whitespace query = opening list"  "scope:git;none:;back:;" "$(rows '   ' git)"
eq "rows: invalid query offers nothing"     "" "$(rows 'a)b' git)"

# ── scope_candidates (from git history) ──────────────────────────────────────
G="$TMP/repo"; git init -q "$G"; (
  cd "$G" && git config user.email t@t && git config user.name t && git config commit.gpgsign false
  for s in "feat(Docker): a" "fix(docker): b" "feat(husky): c" "chore: no scope" "fix(docker): d" "feat(docs): e" "wip not conventional"; do
    git commit -q --allow-empty -m "$s"
  done
)
eq "candidates: most-used first, unique ignoring case (newest spelling wins), no-scope ignored" "docker,docs,husky" "$(cd "$G" && join $(scope_candidates))"
eq "candidates: empty repo"                                                "" "$(cd "$TMP" && git init -q empty && cd empty && join $(scope_candidates))"

# ── build_commit_msg ─────────────────────────────────────────────────────────
eq "msg: with scope"             "refactor(husky): reorganize pre-commit script" "$(build_commit_msg refactor husky 'reorganize pre-commit script')"
eq "msg: custom scope"           "feat(docker): add image cleanup command"       "$(build_commit_msg feat docker 'add image cleanup command')"
eq "msg: no scope has no parens" "feat: add image cleanup command"               "$(build_commit_msg feat '' 'add image cleanup command')"
eq "msg: blank scope = no scope" "feat: add deployment command"                  "$(build_commit_msg feat '   ' 'add deployment command')"
eq "msg: scope is trimmed"       "fix(api): x"                                   "$(build_commit_msg fix '  api ' x)"
# every shape of message must be accepted by the real commit-msg hook
hook_ok() { printf '%s\n' "$1" > "$TMP/msg"; node scripts/hooks/guard.mjs --commit-msg "$TMP/msg" >/dev/null 2>&1; }
ok_ "hook accepts: scoped"    hook_ok "$(build_commit_msg feat docker 'add x')"
ok_ "hook accepts: unscoped"  hook_ok "$(build_commit_msg feat '' 'add x')"
ok_ "hook accepts: spaced scope" hook_ok "$(build_commit_msg fix 'billing, plans' 'add x')"
no_ "hook rejects empty parens (what we must never emit)" hook_ok "feat(): add x"

# ── scope_select: the interactive prompt, driven by scripted keys ────────────
sel "$ENTER";                                    eq "opens with no suggestions: enter = (no scope)" "none|" "$GOT"
sel "doc$ENTER";                                 eq "typing filters; enter takes best match"     "pick|docs" "$GOT"
sel "DOCS$ENTER";                                eq "match ignores case, returns canonical"      "pick|docs" "$GOT"
sel "kubernetes$ENTER";                          eq "new scope accepted straight from typing"    "pick|kubernetes" "$GOT"
sel "git$ENTER";                                 eq "exact existing match wins over create"      "pick|git" "$GOT"
sel "git${DOWN}${ENTER}";                        eq "arrows move within the filtered list"       "pick|github" "$GOT"
sel "git${DOWN}${DOWN}${ENTER}";                 eq "down wraps around the filtered list"        "pick|git" "$GOT"
sel "g${DOWN}i${ENTER}";                         eq "changing the query resets the highlight"    "pick|git" "$GOT"
sel "docx${BS}${ENTER}";                         eq "backspace edits the query"                  "pick|docs" "$GOT"
sel "dock${ENTER}";                              eq "partial match selects docker"               "pick|docker" "$GOT"
sel "docker ${ENTER}";                           eq "trailing space is trimmed"                  "pick|docker" "$GOT"
sel "zzz ${ENTER}";                              eq "trailing space on a new scope is trimmed"   "pick|zzz" "$GOT"
sel "   ${ENTER}";                               eq "leading spaces are ignored, not a scope"    "none|" "$GOT"
sel "a)b${ENTER}";                               eq "forbidden character is not typed"           "pick|ab" "$GOT"
sel "ab${BS}${BS}${ENTER}";                      eq "backspace to empty hides suggestions again"  "none|" "$GOT"
sel "xyz\025${ENTER}";                           eq "ctrl-u clears the query"                    "none|" "$GOT"
sel "a\e[Cb${ENTER}";                            eq "right arrow is not typed"                   "pick|ab" "$GOT"
sel "a\e[3~b${ENTER}";                           eq "delete key sequence is swallowed"           "pick|ab" "$GOT"
sel "${UP}${UP}${ENTER}";                        eq "(no scope) is reachable and selectable"     "none|" "$GOT"
sel "${UP}${ENTER}";                             eq "Back is reachable and selectable"           "back|" "$GOT"
sel "";                                          eq "end of input cancels"                       "cancel|" "$GOT"
sel_esc "" "";                                   eq "lone esc on an empty query goes back"       "back|" "$GOT"
sel_esc "zz" "$ENTER";                           eq "esc clears a typed query first"             "none|" "$GOT"
sel_esc "zz" '\e';                               eq "second esc then goes back"                  "back|" "$GOT"
sel "q${ENTER}";                                 eq "q is typeable in the scope box (no quit)"   "pick|q" "$GOT"

# a typed scope is never written anywhere
before=${#KNOWN[@]}; sel "brandnew$ENTER"
eq "custom scope is not added to the known list" "$before" "${#KNOWN[@]}"
eq "custom scope writes no git config"           "" "$(git config --local --get-regexp '^scope' 2>/dev/null)"

# no history yet
KNOWN_BAK=("${KNOWN[@]}"); KNOWN=()
sel "$ENTER";      eq "no history: first row is (no scope)"  "none|" "$GOT"
sel "x${ENTER}";   eq "no history: typing creates"           "pick|x" "$GOT"
KNOWN=("${KNOWN_BAK[@]}")

# long lists scroll
KNOWN=(); for i in $(seq 1 20); do KNOWN+=("s$i"); done
sel "s${DOWN}${DOWN}${DOWN}${DOWN}${DOWN}${DOWN}${DOWN}${DOWN}${DOWN}${ENTER}"
eq "a 20-match list scrolls past the window" "pick|s10" "$GOT"
sel "${DOWN}${ENTER}"
eq "empty search lists only (no scope) and Back" "back|" "$GOT"
sel "${UP}${ENTER}"
eq "back is one key up from (no scope)" "back|" "$GOT"
sel "s15$ENTER"; eq "scopes below the fold are still searchable" "pick|s15" "$GOT"

# ── type_select: the commit type list is searchable too ──────────────────────
tsel() { type_select < <(printf "$1") >/dev/null 2>&1; GOT="$TYPE_ACTION|$TYPE_RESULT"; }
tsel "$ENTER";                  eq "type: enter takes the first (feat)"          "pick|feat" "$GOT"
tsel "${DOWN}${ENTER}";         eq "type: arrows still work"                     "pick|fix" "$GOT"
tsel "fix${ENTER}";             eq "type: typing the name"                       "pick|fix" "$GOT"
tsel "REF${ENTER}";             eq "type: case-insensitive prefix"               "pick|refactor" "$GOT"
tsel "bug${ENTER}";             eq "type: finds by description (bug → fix)"      "pick|fix" "$GOT"
tsel "ui${ENTER}";              eq "type: description match, list order (ui → style)" "pick|style" "$GOT"
tsel "pe${BS}${BS}t${ENTER}";   eq "type: backspace edits the filter"            "pick|test" "$GOT"
tsel "zzz${ENTER}";             eq "type: no match, enter does nothing → end cancels" "cancel|" "$GOT"
tsel "q";                       eq "type: q quits"                               "quit|" "$GOT"
tsel "zq${ENTER}";              eq "type: q is just a letter mid-search"         "cancel|" "$GOT"
tsel "${UP}${ENTER}";           eq "type: Back is one key up"                    "back|" "$GOT"
tsel "";                        eq "type: end of input cancels"                  "cancel|" "$GOT"

# ── branches: validation, candidates (local + origin), and the picker ────────
ok_ "branch_valid: plain"            branch_valid "feature/billing-tabs"
ok_ "branch_valid: dots and digits"  branch_valid "release-1.2"
no_ "branch_valid: empty"            branch_valid ""
no_ "branch_valid: space"            branch_valid "a b"
no_ "branch_valid: leading dash"     branch_valid "-x"
no_ "branch_valid: double dots"      branch_valid "a..b"
no_ "branch_valid: trailing slash"   branch_valid "a/"
no_ "branch_valid: .lock suffix"     branch_valid "a.lock"
no_ "branch_valid: protected main"   branch_valid "main"
no_ "branch_valid: protected develop" branch_valid "develop"
ok_ "branch_char_ok: slash"          branch_char_ok "/"
no_ "branch_char_ok: space"          branch_char_ok " "
no_ "branch_char_ok: colon"          branch_char_ok ":"
eq "rows: branch rules offer create for a valid new name"    "create:newthing;" "$(LS_VALID=branch_valid rows 'newthing' dev)"
eq "rows: branch rules refuse a protected name (no create)"  ""                 "$(LS_VALID=branch_valid rows 'main' dev)"

BR="$TMP/br"; git init -q "$BR"
( cd "$BR" && git config user.email t@t && git config user.name t && git config commit.gpgsign false \
  && git commit -q --allow-empty -m init && git branch -M feature/alpha && git branch dev && git branch bill-development && git branch main \
  && git update-ref refs/remotes/origin/feature/beta HEAD && git update-ref refs/remotes/origin/dev HEAD && git update-ref refs/remotes/origin/main HEAD )
pushd "$BR" >/dev/null
eq "branch candidates: local + origin, unique, protected hidden" \
   "bill-development,dev,feature/alpha,feature/beta" "$(branch_candidates | cut -f1 | sort | tr '\n' ',' | sed 's/,$//')"
eq "branch candidates: tags say where each lives" \
   "dev=local + remote;feature/alpha=local only;feature/beta=remote only" \
   "$(branch_candidates | grep -E '^(dev|feature/alpha|feature/beta)	' | sort | tr '\t\n' '=;' | sed 's/;$//')"
bsel() { branch_select "feature/alpha" < <(printf "$1") >/dev/null 2>&1; GOT="$BRANCH_ACTION|$BRANCH_RESULT"; }
bsel "beta${ENTER}";            eq "branch: typing finds a remote-only branch"          "pick|feature/beta" "$GOT"
bsel "dev${ENTER}";             eq "branch: exact existing name picks it (no create)"   "pick|dev" "$GOT"
bsel "bill${ENTER}";            eq "branch: partial name picks the match"               "pick|bill-development" "$GOT"
bsel "brand-new${ENTER}";       eq "branch: unknown name = create a new branch"         "create|brand-new" "$GOT"
bsel "a b${ENTER}";             eq "branch: space is not typeable"                      "create|ab" "$GOT"
bsel "main${ENTER}";            eq "branch: a protected name can't be chosen or created" "cancel|" "$GOT"
bsel "${UP}${ENTER}";           eq "branch: Back is one key up from the list"           "back|" "$GOT"
bsel "${ENTER}";                eq "branch: opens with every branch listed (enter = newest)" "pick|$(branch_candidates | head -1 | cut -f1)" "$GOT"
bsel "";                        eq "branch: end of input cancels"                       "cancel|" "$GOT"
tsel "${ENTER}";                eq "branch rules don't leak into the type list"         "pick|feat" "$GOT"
popd >/dev/null

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
