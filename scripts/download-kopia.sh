#!/bin/bash
# Download Kopia binaries for all platforms

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$SCRIPT_DIR/../bin"
VERSION="0.21.1"
BASE_URL="https://github.com/kopia/kopia/releases/download/v${VERSION}"

# Create bin directory
mkdir -p "$BIN_DIR"

# Check if binaries already exist
check_binaries_exist() {
    local platform_check=false

    if [ -n "$PLATFORM_ONLY" ]; then
        OS=$(uname -s)
        ARCH=$(uname -m)
        case "$OS" in
            Linux)
                [ "$ARCH" = "x86_64" ] && [ -f "$BIN_DIR/kopia-linux-x64" ] && platform_check=true
                [ "$ARCH" = "aarch64" ] && [ -f "$BIN_DIR/kopia-linux-arm64" ] && platform_check=true
                ;;
            Darwin)
                [ "$ARCH" = "x86_64" ] && [ -f "$BIN_DIR/kopia-darwin-x64" ] && platform_check=true
                [ "$ARCH" = "arm64" ] && [ -f "$BIN_DIR/kopia-darwin-arm64" ] && platform_check=true
                ;;
            MINGW*|MSYS*|CYGWIN*)
                [ -f "$BIN_DIR/kopia-windows-x64.exe" ] && platform_check=true
                ;;
        esac
        echo $platform_check
    else
        # Check all platforms
        if [ -f "$BIN_DIR/kopia-linux-x64" ] && \
           [ -f "$BIN_DIR/kopia-linux-arm64" ] && \
           [ -f "$BIN_DIR/kopia-darwin-x64" ] && \
           [ -f "$BIN_DIR/kopia-darwin-arm64" ] && \
           [ -f "$BIN_DIR/kopia-windows-x64.exe" ]; then
            echo true
        else
            echo false
        fi
    fi
}

# Check if binaries exist
if [ "$(check_binaries_exist)" = "true" ]; then
    echo "✓ Kopia v${VERSION} binaries already installed"
    exit 0
fi

echo "📦 Downloading Kopia v${VERSION} binaries..."
echo ""

# Download function - simple and direct
download() {
    local platform=$1
    local filename=$2
    local output=$3
    local url="${BASE_URL}/${filename}"

    echo "⬇️  $platform..."

    # Skip if binary already exists
    if [ -f "$BIN_DIR/$output" ]; then
        echo "   ✓ Already exists: $output"
        echo ""
        return 0
    fi

    # Download with curl (silent mode, show errors, follow redirects)
    if curl -fsSL "$url" -o "/tmp/${filename}"; then
        # Extract based on file type
        if [[ $filename == *.tar.gz ]]; then
            tar -xzf "/tmp/${filename}" -C /tmp
            # The archive contains a directory like "kopia-0.21.1-linux-x64/"
            local dir="${filename%.tar.gz}"
            if [ -f "/tmp/${dir}/kopia" ]; then
                # Try to copy, handle busy file
                if cp "/tmp/${dir}/kopia" "$BIN_DIR/$output" 2>/dev/null; then
                    chmod +x "$BIN_DIR/$output"
                else
                    # File might be in use, try with temp file
                    cp "/tmp/${dir}/kopia" "$BIN_DIR/${output}.tmp" && \
                    mv -f "$BIN_DIR/${output}.tmp" "$BIN_DIR/$output" 2>/dev/null || \
                    echo "   ⚠️  File in use, skipping"
                fi
                rm -rf "/tmp/${dir}"
            fi
        elif [[ $filename == *.zip ]]; then
            unzip -q "/tmp/${filename}" -d /tmp
            # The archive contains a directory like "kopia-0.21.1-windows-x64/"
            local dir="${filename%.zip}"
            if [ -f "/tmp/${dir}/kopia.exe" ]; then
                # Try to copy, handle busy file
                if cp "/tmp/${dir}/kopia.exe" "$BIN_DIR/$output" 2>/dev/null; then
                    :
                else
                    # File might be in use, try with temp file
                    cp "/tmp/${dir}/kopia.exe" "$BIN_DIR/${output}.tmp" && \
                    mv -f "$BIN_DIR/${output}.tmp" "$BIN_DIR/$output" 2>/dev/null || \
                    echo "   ⚠️  File in use, skipping"
                fi
                rm -rf "/tmp/${dir}"
            fi
        fi
        rm -f "/tmp/${filename}"

        if [ -f "$BIN_DIR/$output" ]; then
            echo "   ✓ Installed: $output"
        else
            echo "   ⚠️  Failed to extract binary"
            return 1
        fi
    else
        echo "   ⚠️  Download failed"
        return 1
    fi
    echo ""
}

# Download based on PLATFORM_ONLY env var (CI optimization)
if [ -n "$PLATFORM_ONLY" ]; then
    echo "📥 Downloading for current platform only"
    echo ""

    OS=$(uname -s)
    ARCH=$(uname -m)

    case "$OS" in
        Linux)
            [ "$ARCH" = "x86_64" ] && download "Linux x64" "kopia-${VERSION}-linux-x64.tar.gz" "kopia-linux-x64"
            [ "$ARCH" = "aarch64" ] && download "Linux ARM64" "kopia-${VERSION}-linux-arm64.tar.gz" "kopia-linux-arm64"
            ;;
        Darwin)
            [ "$ARCH" = "x86_64" ] && download "macOS x64" "kopia-${VERSION}-macOS-x64.tar.gz" "kopia-darwin-x64"
            [ "$ARCH" = "arm64" ] && download "macOS ARM64" "kopia-${VERSION}-macOS-arm64.tar.gz" "kopia-darwin-arm64"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            download "Windows x64" "kopia-${VERSION}-windows-x64.zip" "kopia-windows-x64.exe"
            ;;
    esac
else
    echo "📥 Downloading for all platforms"
    echo ""

    download "Linux x64" "kopia-${VERSION}-linux-x64.tar.gz" "kopia-linux-x64"
    download "Linux ARM64" "kopia-${VERSION}-linux-arm64.tar.gz" "kopia-linux-arm64"
    download "macOS x64" "kopia-${VERSION}-macOS-x64.tar.gz" "kopia-darwin-x64"
    download "macOS ARM64" "kopia-${VERSION}-macOS-arm64.tar.gz" "kopia-darwin-arm64"
    download "Windows x64" "kopia-${VERSION}-windows-x64.zip" "kopia-windows-x64.exe"
fi

echo "✅ Done!"
echo "📁 Binaries location: $BIN_DIR"
echo ""
