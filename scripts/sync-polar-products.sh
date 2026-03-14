#!/usr/bin/env bash
# sync-polar-products.sh
# Idempotent sync of Polar.sh products.
# Usage: ./scripts/sync-polar-products.sh [--dry-run]
#
# Behavior:
#   - If a plan with the exact name already exists (not archived) → [SKIP]
#   - If a plan does not exist → [CREATE]
# This makes it safe to run on every CI push.

set -euo pipefail

: "${POLAR_ACCESS_TOKEN:?POLAR_ACCESS_TOKEN is required}"
: "${POLAR_ORG_ID:?POLAR_ORG_ID is required}"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo "[DRY-RUN] No API calls will be made"

BASE_URL="https://api.polar.sh/v1"

# ── Plan definitions ─────────────────────────────────────────────────────────
# Format: "name:price_usd_cents:quota_req_per_month"
PLANS=(
  "Free:0:50"
  "Starter:900:1000"
  "Pro:2900:10000"
)

# ── Fetch existing products ──────────────────────────────────────────────────
echo "Fetching existing Polar products..."
HTTP_CODE=$(curl -sL -o /tmp/polar_existing.json -w "%{http_code}" \
  "${BASE_URL}/products?organization_id=${POLAR_ORG_ID}&limit=100" \
  -H "Authorization: Bearer ${POLAR_ACCESS_TOKEN}")
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "❌ Polar API returned HTTP ${HTTP_CODE}: $(cat /tmp/polar_existing.json)"
  exit 1
fi
EXISTING_JSON=$(cat /tmp/polar_existing.json)

# ── Process each plan ────────────────────────────────────────────────────────
for PLAN_DEF in "${PLANS[@]}"; do
  IFS=':' read -r NAME PRICE_CENTS QUOTA <<< "$PLAN_DEF"

  EXISTS=$(echo "$EXISTING_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', data.get('result', []))
found = any(p['name'] == '${NAME}' for p in items if not p.get('is_archived', False))
print('true' if found else 'false')
")

  if [[ "$EXISTS" == "true" ]]; then
    echo "[SKIP] ${NAME} already exists"
    continue
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    PRICE_USD=$(python3 -c "print('%.2f' % (${PRICE_CENTS}/100))")
    echo "[DRY-RUN CREATE] ${NAME} — \$${PRICE_USD}/month — ${QUOTA} req/month"
    continue
  fi

  echo "[CREATE] Creating ${NAME}..."
  RESULT=$(curl -sf -X POST \
    "${BASE_URL}/products" \
    -H "Authorization: Bearer ${POLAR_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"organization_id\": \"${POLAR_ORG_ID}\",
      \"name\": \"${NAME}\",
      \"description\": \"NEX-US API ${NAME} Plan — ${QUOTA} requests/month\",
      \"prices\": [{
        \"type\": \"recurring\",
        \"amount_type\": \"fixed\",
        \"price_amount\": ${PRICE_CENTS},
        \"price_currency\": \"usd\",
        \"recurring_interval\": \"month\"
      }]
    }")

  PRODUCT_ID=$(python3 -c "import json; d=${RESULT}; print(d.get('id', 'ERROR: ' + str(d)))" 2>/dev/null || echo "ERROR")
  echo "[CREATED] ${NAME} → id: ${PRODUCT_ID}"
done

echo "Sync complete."
