#!/usr/bin/env python3
"""
Verify program IDs are consistent across:
  1. Anchor.toml [programs.devnet]
  2. packages/sdk/src/constants.ts
  3. services/kyc-issuer/src/issuer.ts
  4. Each program's lib.rs declare_id!()
"""
import re, sys, pathlib, tomllib

ROOT = pathlib.Path(__file__).resolve().parent.parent
errors = []

# 1. Anchor.toml (source of truth)
anchor_toml = tomllib.loads((ROOT / "Anchor.toml").read_text())
anchor_ids = anchor_toml["programs"]["devnet"]
print("=== Anchor.toml devnet IDs ===")
for name, pid in sorted(anchor_ids.items()):
    print(f"  {name:25s} = {pid}")

# 2. SDK constants.ts
print("\n=== SDK constants.ts check ===")
sdk_text = (ROOT / "packages/sdk/src/constants.ts").read_text()
SDK_MAP = {
    "human_registry": "humanRegistry",
    "agent_registry": "agentRegistry",
    "delegation": "delegation",
    "receipts": "receipts",
}
for anchor_name, sdk_key in SDK_MAP.items():
    expected = anchor_ids[anchor_name]
    pattern = rf"{sdk_key}:\s*new\s+PublicKey\(['\"]([^'\"]+)['\"]\)"
    match = re.search(pattern, sdk_text)
    if not match:
        errors.append(f"SDK: could not find {sdk_key} in constants.ts")
        print(f"  ❌ {sdk_key}: NOT FOUND")
    elif match.group(1) != expected:
        errors.append(f"SDK {sdk_key}: {match.group(1)} != Anchor.toml {expected}")
        print(f"  ❌ {sdk_key}: {match.group(1)} != {expected}")
    else:
        print(f"  ✅ {sdk_key}: {expected}")

# 3. KYC issuer.ts
print("\n=== KYC issuer.ts check ===")
issuer_text = (ROOT / "services/kyc-issuer/src/issuer.ts").read_text()
match = re.search(r"HUMAN_REGISTRY_PROGRAM_ID\s*=\s*new\s+PublicKey\(['\"]([^'\"]+)['\"]\)", issuer_text)
expected_hr = anchor_ids["human_registry"]
if not match:
    errors.append("KYC issuer.ts: HUMAN_REGISTRY_PROGRAM_ID not found")
    print("  ❌ HUMAN_REGISTRY_PROGRAM_ID: NOT FOUND")
elif match.group(1) != expected_hr:
    errors.append(f"KYC issuer.ts: {match.group(1)} != {expected_hr}")
    print(f"  ❌ HUMAN_REGISTRY_PROGRAM_ID: {match.group(1)} != {expected_hr}")
else:
    print(f"  ✅ HUMAN_REGISTRY_PROGRAM_ID: {expected_hr}")

# 4. Rust declare_id!() in each program
print("\n=== Rust declare_id!() check ===")
PROGRAM_DIRS = {
    "human_registry": "programs/human_registry/src/lib.rs",
    "agent_registry": "programs/agent_registry/src/lib.rs",
    "delegation": "programs/delegation/src/lib.rs",
    "receipts": "programs/receipts/src/lib.rs",
}
for name, lib_path in sorted(PROGRAM_DIRS.items()):
    full_path = ROOT / lib_path
    if not full_path.exists():
        print(f"  ⚠️  {name}: {lib_path} not found (skipped)")
        continue
    rust_text = full_path.read_text()
    match = re.search(r'declare_id!\(\s*"([^"]+)"\s*\)', rust_text)
    expected = anchor_ids[name]
    if not match:
        errors.append(f"Rust {name}: declare_id! not found in {lib_path}")
        print(f"  ❌ {name}: declare_id! NOT FOUND")
    elif match.group(1) != expected:
        errors.append(f"Rust {name}: {match.group(1)} != {expected}")
        print(f"  ❌ {name}: {match.group(1)} != {expected}")
    else:
        print(f"  ✅ {name}: {expected}")

# Result
if errors:
    print(f"\n❌ FAILED — {len(errors)} inconsistencies:")
    for e in errors:
        print(f"  • {e}")
    sys.exit(1)
else:
    print("\n✅ All program IDs consistent")
    sys.exit(0)
