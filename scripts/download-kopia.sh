#!/bin/bash
# Download Kopia binaries for all platforms

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$SCRIPT_DIR/../bin"

echo "🔍 Fetching latest Kopia release info..."

# Get latest release info from GitHub API
LATEST_RELEASE=$(curl -s https://api.github.com/repos/kopia/kopia/releases/latest)
VERSION=$(echo "$LATEST_RELEASE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

echo "📦 Latest Kopia version: $VERSION"
echo ""

# Create bin directory if it doesn't exist
mkdir -p "$BIN_DIR"

# Function to download and extract
download_binary() {
    local platform=$1
    local filename=$2
    local binary_name=$3
    local url="https://github.com/kopia/kopia/releases/download/$VERSION/$filename"

    echo "⬇️  Downloading Kopia for $platform..."
    echo "   URL: $url"

    cd /tmp

    # Use curl (cross-platform) or fall back to wget
    if command -v curl &> /dev/null; then
        curl -L -o "$filename" "$url" 2>&1 | grep -v "^  % Total" || true
    elif command -v wget &> /dev/null; then
        wget -q "$url"
    else
        echo "❌ Error: Neither curl nor wget found"
        return 1
    fi

    if [ -f "$filename" ]; then
        echo "✓ Downloaded: $filename"

        # Extract based on file type
        if [[ $filename == *.tar.gz ]]; then
            tar -xzf "$filename"
            # Find the kopia binary in extracted folder
            extracted_dir="${filename%.tar.gz}"
            if [ -f "$extracted_dir/kopia" ]; then
                cp "$extracted_dir/kopia" "$BIN_DIR/$binary_name"
                chmod +x "$BIN_DIR/$binary_name"
            elif [ -f "kopia-$extracted_dir/kopia" ]; then
                cp "kopia-$extracted_dir/kopia" "$BIN_DIR/$binary_name"
                chmod +x "$BIN_DIR/$binary_name"
            fi
            rm -rf "$extracted_dir" "kopia-$extracted_dir"
        elif [[ $filename == *.zip ]]; then
            unzip -q "$filename"
            extracted_dir="${filename%.zip}"
            if [ -f "$extracted_dir/kopia.exe" ]; then
                cp "$extracted_dir/kopia.exe" "$BIN_DIR/$binary_name"
            elif [ -f "kopia.exe" ]; then
                cp "kopia.exe" "$BIN_DIR/$binary_name"
            fi
            rm -rf "$extracted_dir" kopia.exe
        fi

        rm -f "$filename"

        if [ -f "$BIN_DIR/$binary_name" ]; then
            echo "✓ Installed: $BIN_DIR/$binary_name"
            ls -lh "$BIN_DIR/$binary_name"
        else
            echo "⚠️  Warning: Binary not found after extraction"
        fi
    else
        echo "❌ Failed to download $filename"
        return 1
    fi

    echo ""
}

# Determine which platforms to download
# If PLATFORM_ONLY is set, only download for current platform (CI optimization)
# Otherwise download all platforms (local development)
if [ -n "$PLATFORM_ONLY" ]; then
    echo "📥 Downloading Kopia binary for current platform only..."
    echo ""

    # Detect current platform
    OS=$(uname -s)
    ARCH=$(uname -m)

    case "$OS" in
        Linux)
            if [ "$ARCH" = "x86_64" ]; then
                download_binary "Linux x64" "kopia-${VERSION#v}-linux-x64.tar.gz" "kopia-linux-x64"
            elif [ "$ARCH" = "aarch64" ]; then
                download_binary "Linux ARM64" "kopia-${VERSION#v}-linux-arm64.tar.gz" "kopia-linux-arm64"
            fi
            ;;
        Darwin)
            if [ "$ARCH" = "x86_64" ]; then
                download_binary "macOS x64" "kopia-${VERSION#v}-macOS-x64.tar.gz" "kopia-darwin-x64"
            elif [ "$ARCH" = "arm64" ]; then
                download_binary "macOS ARM64" "kopia-${VERSION#v}-macOS-arm64.tar.gz" "kopia-darwin-arm64"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            if [ "$ARCH" = "x86_64" ]; then
                download_binary "Windows x64" "kopia-${VERSION#v}-windows-x64.zip" "kopia-windows-x64.exe"
            elif [ "$ARCH" = "aarch64" ]; then
                download_binary "Windows ARM64" "kopia-${VERSION#v}-windows-arm64.zip" "kopia-windows-arm64.exe"
            fi
            ;;
    esac
else
    # Download binaries for all platforms
    echo "📥 Downloading Kopia binaries for all platforms..."
    echo ""

    # Linux x64
    download_binary "Linux x64" "kopia-${VERSION#v}-linux-x64.tar.gz" "kopia-linux-x64"

    # Linux ARM64
    download_binary "Linux ARM64" "kopia-${VERSION#v}-linux-arm64.tar.gz" "kopia-linux-arm64"

    # macOS x64 (Intel)
    download_binary "macOS x64" "kopia-${VERSION#v}-macOS-x64.tar.gz" "kopia-darwin-x64"

    # macOS ARM64 (Apple Silicon)
    download_binary "macOS ARM64" "kopia-${VERSION#v}-macOS-arm64.tar.gz" "kopia-darwin-arm64"

    # Windows x64
    download_binary "Windows x64" "kopia-${VERSION#v}-windows-x64.zip" "kopia-windows-x64.exe"

    # Windows ARM64
    download_binary "Windows ARM64" "kopia-${VERSION#v}-windows-arm64.zip" "kopia-windows-arm64.exe"
fi

echo ""
echo "✅ All Kopia binaries downloaded!"
echo ""
echo "📁 Binaries location: $BIN_DIR"
ls -lh "$BIN_DIR"/kopia-*
echo ""
echo "🚀 You can now run: pnpm tauri:dev"
