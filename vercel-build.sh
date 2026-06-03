#!/usr/bin/env bash
# Build the frontend workspace and place its static export in every directory
# Vercel might check for output — the cwd Vercel invoked us from, the repo root,
# the frontend dir, and every workspace dir — both as a plain out/ and as the
# authoritative Build Output API (.vercel/output). This is robust to whatever
# Root Directory the Vercel project is configured with.
set -eu

START="$(pwd)"
CFG="$(find /vercel -maxdepth 6 -name next.config.js -not -path '*node_modules*' 2>/dev/null | head -1)"
if [ -z "${CFG:-}" ]; then
  CFG="$(find / -maxdepth 8 -name next.config.js -not -path '*node_modules*' 2>/dev/null | head -1)"
fi
FRONT="$(cd "$(dirname "$CFG")" && pwd)"
ROOT="$(dirname "$FRONT")"
echo "[vercel-build] start=$START frontend=$FRONT root=$ROOT"

cd "$FRONT"
npx --no-install next build
SRC="$FRONT/out"

# Candidate base directories Vercel may resolve the output against.
BASES="$START $ROOT $FRONT"
for d in "$ROOT"/*/; do
  BASES="$BASES ${d%/}"
done

for BASE in $BASES; do
  [ -d "$BASE" ] || continue
  if [ "$BASE" != "$FRONT" ]; then
    rm -rf "$BASE/out"
    cp -r "$SRC" "$BASE/out"
  fi
  mkdir -p "$BASE/.vercel/output/static"
  cp -r "$SRC/." "$BASE/.vercel/output/static/"
  printf '{"version":3}' > "$BASE/.vercel/output/config.json"
  echo "[vercel-build] wrote $BASE/out + .vercel/output"
done

echo "[vercel-build] done"
