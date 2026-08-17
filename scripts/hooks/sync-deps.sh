#!/bin/sh
# Post-merge / post-checkout hint. Deliberately only PRINTS: auto-running an
# install on every branch switch is slow, surprising, and breaks `git bisect`.
changed=$(git diff --name-only "$1" "$2" 2>/dev/null) || exit 0
case "$changed" in
  *pnpm-lock.yaml*) echo "hint: pnpm-lock.yaml changed on this branch — run 'pnpm install'." ;;
esac
case "$changed" in
  *prisma/schema.prisma*) echo "hint: prisma/schema.prisma changed — run 'pnpm exec prisma generate' (and 'migrate dev' if the DB is behind)." ;;
esac
exit 0
