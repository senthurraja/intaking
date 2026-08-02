#!/usr/bin/env bash
#
# Assembles the unmanaged solution zip from src/ plus the flow definitions in ../flows/.
#
# The flow JSONs live in ../flows/ so they stay readable and reviewable in git. This script
# strips their $comment keys, copies them into the package under the GUIDs that
# Customizations.xml expects, and zips the result.
#
# Requires: zip. Uses python3 for comment-stripping if present, otherwise copies verbatim
# (Power Platform tolerates unknown keys, so this is a tidiness step, not a correctness one).

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/src"
flows="$here/../flows"
dist="$here/dist"
stage="$here/.stage"

version="1_0_0_0"
name="ITTriageAgent_${version}.zip"

rm -rf "$stage" && mkdir -p "$stage" "$dist"
cp -r "$src/." "$stage/"
mkdir -p "$stage/Workflows"

copy_flow () {
  local source_file="$1" target_file="$2"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$source_file" "$stage/Workflows/$target_file" <<'PY'
import json, sys

def strip(node):
    if isinstance(node, dict):
        return {k: strip(v) for k, v in node.items() if not k.startswith("$comment")}
    if isinstance(node, list):
        return [strip(v) for v in node]
    return node

src, dst = sys.argv[1], sys.argv[2]
with open(src, encoding="utf-8") as fh:
    data = json.load(fh)
with open(dst, "w", encoding="utf-8") as fh:
    json.dump(strip(data), fh, indent=2, ensure_ascii=False)
PY
  else
    cp "$source_file" "$stage/Workflows/$target_file"
  fi
  echo "  packed $target_file"
}

echo "Packing solution $version"
copy_flow "$flows/ClassifyAndDraft.json"       "ITTriage_ClassifyAndDraft-A1F1C001-0001-4001-8001-000000000001.json"
copy_flow "$flows/RequestApproval.json"        "ITTriage_RequestApproval-A1F1C002-0002-4002-8002-000000000002.json"
copy_flow "$flows/ReleaseQueuedApprovals.json" "ITTriage_ReleaseQueuedApprovals-A1F1C003-0003-4003-8003-000000000003.json"

cat > "$stage/[Content_Types].xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="text/xml" />
  <Default Extension="json" ContentType="application/json" />
</Types>
XML

rm -f "$dist/$name"
( cd "$stage" && zip -q -r "$dist/$name" . )
rm -rf "$stage"

echo
echo "Built $dist/$name"
echo "Import at make.powerautomate.com -> Solutions -> Import solution."
echo "Then do the three manual steps in solution/README.md - they are never automatic."
