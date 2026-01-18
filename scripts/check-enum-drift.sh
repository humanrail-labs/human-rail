#!/bin/bash
# H-03 Drift Detection: Verify CPI mirror enums match humanrail-common
# Run: ./scripts/check-enum-drift.sh

set -e

COMMON_FILE="programs/common/src/lib.rs"
DRIFT_FOUND=0

# Extract enum variants from common
get_variants() {
    local enum_name=$1
    grep -A 20 "^pub enum $enum_name" "$COMMON_FILE" | \
        grep -E "^\s+(Active|Suspended|Revoked|Expired|Frozen|Disputed)" | \
        tr -d ' ,' | sort
}

# Check a file for matching variants
check_file() {
    local file=$1
    local enum_name=$2
    local common_variants=$(get_variants "$enum_name")
    
    if grep -q "^pub enum $enum_name" "$file" 2>/dev/null; then
        local file_variants=$(grep -A 20 "^pub enum $enum_name" "$file" | \
            grep -E "^\s+(Active|Suspended|Revoked|Expired|Frozen|Disputed)" | \
            tr -d ' ,' | sort)
        
        if [ "$common_variants" != "$file_variants" ]; then
            echo "❌ DRIFT DETECTED: $enum_name in $file"
            echo "   Common:  $common_variants"
            echo "   File:    $file_variants"
            DRIFT_FOUND=1
        else
            echo "✅ $enum_name matches in $file"
        fi
    fi
}

echo "=== H-03 Enum Drift Check ==="
echo ""

# Check AgentStatus
for file in \
    programs/data_blink/src/instructions/agent_submit_response.rs \
    programs/document_registry/src/instructions/sign_document_agent.rs \
    programs/document_registry/src/instructions/sign_document_agent_autonomous.rs \
    programs/human_pay/src/instructions/agent_pay_invoice.rs
do
    check_file "$file" "AgentStatus"
done

echo ""

# Check CapabilityStatus
for file in \
    programs/data_blink/src/instructions/agent_submit_response.rs \
    programs/document_registry/src/instructions/sign_document_agent.rs \
    programs/document_registry/src/instructions/sign_document_agent_autonomous.rs \
    programs/human_pay/src/instructions/agent_pay_invoice.rs
do
    check_file "$file" "CapabilityStatus"
done

echo ""
if [ $DRIFT_FOUND -eq 1 ]; then
    echo "❌ DRIFT DETECTED - Update mirrors to match humanrail-common"
    exit 1
else
    echo "✅ All enum mirrors match humanrail-common"
    exit 0
fi
