#!/bin/bash

osascript -e 'tell application "Cursor" to activate' \
         -e 'tell application "System Events" to keystroke "p" using {command down, shift down}' \
         -e 'tell application "System Events" to keystroke "@command:youtube-in-vs-code.openAndPlayDefault"' \
         -e 'tell application "System Events" to key code 36' 2>/dev/null || true

echo "{}"
