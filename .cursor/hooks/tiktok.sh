#!/bin/bash

osascript -e 'tell application "Google Chrome" to activate' -e 'tell application "Google Chrome" to open location "https://www.tiktok.com/en"' 2>/dev/null || true

echo "{}"