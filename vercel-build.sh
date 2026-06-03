#!/usr/bin/env bash
# Vercel build for the frontend workspace. Robust to whatever working
# directory Vercel runs the build from, and emits output in every form Vercel
# might look for: a plain out/ dir at both the frontend and repo-root bases,
# plus the authoritative Build Output API (.vercel/output) at both bases.
set -eu

# Locate the Next.js app by its config, regardless of cwd.
CFG="$(find /vercel -maxdepth 6 -name next.config.js -not -path '*node_modules*' 2>/dev/null | head -1)"
if [ -z "${CFG:-}" ]; then
  CFG="$(find / -maxdepth 8 -name next.config.js -not -path '*node_modules*' 2>/dev/null | head -1)"
fi
FRONT="$(cd "$(dirname "$CFG")" && pwd)"
ROOT="$(dirname "$FRONT")"
echo "[vercel-build] frontend=$FRONT root=$ROOT"

cd "$FRONT"
npx --no-install next build

# Plain output directory at the repo root (frontend/out already exists).
rm -rf "$ROOT/out"
cp -r "$FRONT/out" "$ROOT/out"

# Build Output API v3 (authoritative — Vercel serves .vercel/output/static).
for BASE in "$FRONT" "$ROOT"; do
  mkdir -p "$BASE/.vercel/output/static"
  cp -r "$FRONT/out/." "$BASE/.vercel/output/static/"
  printf '{"version":3}' > "$BASE/.vercel/output/config.json"
  echo "[vercel-build] wrote $BASE/.vercel/output"
done

echo "[vercel-build] done"
