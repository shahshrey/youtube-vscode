#!/bin/bash

echo "Building YouTube in VS Code extension..."

# Ensure we're in the right directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install dependencies
echo "Installing dependencies..."
npm install

# Compile TypeScript
echo "Compiling TypeScript..."
npm run compile

# Check if vsce is installed
if ! command -v vsce &> /dev/null
then
    echo "Installing vsce globally..."
    npm install -g vsce
fi

# Package the extension
echo "Creating VSIX package..."
vsce package

echo "Done! Your VSIX file has been created."
echo "Install it with: code --install-extension youtube-in-vscode-0.0.1.vsix"
