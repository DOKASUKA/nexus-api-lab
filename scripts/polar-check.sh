#!/usr/bin/env bash
# polar-check.sh
# CLI helper for Polar.sh API operations.
# Replaces manual copy-paste of curl commands while Polar MCP is unavailable.
#
# Usage:
#   POLAR_ACCESS_TOKEN=... POLAR_ORG_ID=... ./scripts/polar-check.sh <command> [args]
#
# Commands:
#   products               List all products (active + archived)
#   license <key>          Validate a license key and show status/usage
#   customers              List customers
#   benefits               List benefits attached to the org

set -euo pipefail

: "${POLAR_ACCESS_TOKEN:?Set POLAR_ACCESS_TOKEN}"
POLAR_ORG_ID="${POLAR_ORG_ID:-}"
BASE_URL="https://api.polar.sh/v1"

_json() {
  python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))"
}

_table() {
  python3 - "$@"
}

CMD="${1:-help}"

case "$CMD" in
  products)
    echo "=== Polar Products ==="
    RESP=$(curl -sf -X GET \
      "${BASE_URL}/products?organization_id=${POLAR_ORG_ID}&limit=100" \
      -H "Authorization: Bearer ${POLAR_ACCESS_TOKEN}")
    echo "$RESP" | _table <<'EOF'
import sys, json
d = json.load(sys.stdin)
items = d.get('items', [])
print(f"Total: {len(items)}")
for p in items:
    archived = " [ARCHIVED]" if p.get("is_archived") else ""
    print(f"  {p['name']}{archived}")
    print(f"    id:   {p['id']}")
    for price in p.get("prices", []):
        amt = price.get("price_amount", 0)
        interval = price.get("recurring_interval", "one_time")
        print(f"    price: ${amt/100:.2f}/{interval}")
EOF
    ;;

  license)
    KEY="${2:?Usage: $0 license <key>}"
    echo "=== License Key Validation ==="
    RESP=$(curl -sf -X POST \
      "${BASE_URL}/license-keys/validate" \
      -H "Authorization: Bearer ${POLAR_ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"key\": \"${KEY}\", \"organization_id\": \"${POLAR_ORG_ID}\"}" 2>/dev/null || echo '{"error":"request_failed"}')
    echo "$RESP" | _table <<'EOF'
import sys, json
d = json.load(sys.stdin)
if "status" in d:
    valid = d["status"] == "granted"
    print(f"  Key:       {d.get('display_key', d.get('key', 'n/a'))}")
    print(f"  Status:    {d['status']}")
    print(f"  Valid:     {'✅ YES' if valid else '❌ NO'}")
    print(f"  Usage:     {d.get('usage', 'n/a')} / {d.get('limit_usage', 'unlimited')}")
    print(f"  Expires:   {d.get('expires_at', 'never')}")
else:
    print("Error:", json.dumps(d, indent=2))
EOF
    ;;

  customers)
    echo "=== Polar Customers ==="
    RESP=$(curl -sf -X GET \
      "${BASE_URL}/customers?organization_id=${POLAR_ORG_ID}&limit=100" \
      -H "Authorization: Bearer ${POLAR_ACCESS_TOKEN}")
    echo "$RESP" | _table <<'EOF'
import sys, json
d = json.load(sys.stdin)
items = d.get('items', [])
print(f"Total: {len(items)}")
for c in items:
    print(f"  {c.get('email', 'unknown')}  (id: {c['id']})")
EOF
    ;;

  benefits)
    echo "=== Polar Benefits ==="
    RESP=$(curl -sf -X GET \
      "${BASE_URL}/benefits?organization_id=${POLAR_ORG_ID}&limit=100" \
      -H "Authorization: Bearer ${POLAR_ACCESS_TOKEN}")
    echo "$RESP" | _table <<'EOF'
import sys, json
d = json.load(sys.stdin)
items = d.get('items', [])
print(f"Total: {len(items)}")
for b in items:
    print(f"  {b.get('description', b.get('type', 'unknown'))}  (type: {b.get('type')}, id: {b['id']})")
EOF
    ;;

  help|*)
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  products           List all products"
    echo "  license <key>      Validate a license key"
    echo "  customers          List customers"
    echo "  benefits           List benefits"
    echo ""
    echo "Environment:"
    echo "  POLAR_ACCESS_TOKEN  (required)"
    echo "  POLAR_ORG_ID        (required for org-scoped commands)"
    ;;
esac
