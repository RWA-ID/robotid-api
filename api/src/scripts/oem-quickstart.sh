#!/usr/bin/env bash
# oem-quickstart.sh — colored pass/fail smoke check for the robot-id.eth API.
# Aborts on first regression. Wire into CI as a production smoke gate (§9.3).
#
# Usage: API_URL=http://localhost:3001 [API_KEY=rid_...] bash oem-quickstart.sh
set -uo pipefail

API_URL="${API_URL:-http://localhost:3001}"
API_KEY="${API_KEY:-}"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
pass=0; fail=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo -e "${GREEN}✓${NC} $name ($actual)"; pass=$((pass+1))
  else
    echo -e "${RED}✗${NC} $name — expected $expected, got $actual"; fail=$((fail+1))
    echo -e "${RED}ABORT: regression detected${NC}"; exit 1
  fi
}

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo -e "${YELLOW}== robot-id.eth API smoke ==${NC}  $API_URL"

check "GET /health"        200 "$(code "$API_URL/health")"
check "GET /auth/tiers"    200 "$(code "$API_URL/auth/tiers")"
check "GET /docs"          200 "$(code -L "$API_URL/docs/")"
check "GET /openapi.json"  200 "$(code "$API_URL/openapi.json")"

# subscription-gating: protected route without a key must be 401
check "POST /robots (no key) → 401" 401 \
  "$(code -X POST -H 'content-type: application/json' -d '{}' "$API_URL/api/v1/robots")"

# expired/invalid key → 401 (invalid) ; an inactive subscription would be 402
check "GET /keys/info (bad key) → 401" 401 \
  "$(code -H 'Authorization: Bearer rid_invalid' "$API_URL/auth/keys/info")"

if [[ -n "$API_KEY" ]]; then
  check "GET /keys/info (valid key)" 200 \
    "$(code -H "Authorization: Bearer $API_KEY" "$API_URL/auth/keys/info")"
fi

echo -e "${YELLOW}== done ==${NC}  ${GREEN}$pass passed${NC} / ${RED}$fail failed${NC}"
[[ $fail -eq 0 ]]
