#!/usr/bin/env bash
set -euo pipefail

mkdir -p .anchor

# anchor keys list output format: "name: Pubkey"
json='{ "cluster": "localnet"'
while IFS= read -r line; do
  name="$(echo "$line" | awk -F: '{print $1}' | xargs)"
  pk="$(echo "$line" | awk -F: '{print $2}' | xargs)"
  [ -z "$name" ] && continue
  [ -z "$pk" ] && continue
  json+=",\n  \"${name}\": \"${pk}\""
done < <(anchor keys list)

json+="\n}\n"
echo -e "$json" > .anchor/program-ids.localnet.json
echo "Wrote .anchor/program-ids.localnet.json"
