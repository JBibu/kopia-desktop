#!/bin/bash
# Bump version across all project files
# Usage: ./scripts/bump-version.sh <version>
# Example: ./scripts/bump-version.sh 1.0.0

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.0"
    echo ""
    echo "Current versions:"
    echo "  package.json:        $(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')"
    echo "  tauri.conf.json:     $(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')"
    echo "  Cargo.toml:          $(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/.*= "\(.*\)"/\1/')"
    exit 1
fi

VERSION="$1"

# Validate version format (semver)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
    echo "Error: Invalid version format. Use semver (e.g., 1.0.0 or 1.0.0-beta.1)"
    exit 1
fi

echo "Bumping version to $VERSION..."

# Update package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
echo "  Updated package.json"

# Update tauri.conf.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
echo "  Updated src-tauri/tauri.conf.json"

# Update Cargo.toml (only the package version, not dependencies)
sed -i "0,/^version = \"[^\"]*\"/s//version = \"$VERSION\"/" src-tauri/Cargo.toml
echo "  Updated src-tauri/Cargo.toml"

echo ""
echo "Version bumped to $VERSION"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add -A && git commit -m \"chore: bump version to $VERSION\""
echo "  3. Tag: git tag v$VERSION"
echo "  4. Push: git push && git push origin v$VERSION"
