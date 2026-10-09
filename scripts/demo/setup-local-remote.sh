#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
runtime="$root/demo/.runtime"
origin="$runtime/origin/target.git"
work="$runtime/setup-work"

rm -rf "$origin" "$work"
mkdir -p "$origin"
git init --bare --initial-branch=main "$origin" >/dev/null

cp -r "$root/demo/target-repo" "$work"
cd "$work"
git init --initial-branch=main >/dev/null
git add -A
git -c user.name="Copycat Demo" -c user.email="demo@copycat.local" commit -m "initial demo app" >/dev/null
git remote add origin "$origin"
git push -u origin main >/dev/null

echo "local remote ready: $origin"
echo "create the project with repo_url: $origin"
