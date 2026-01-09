#!/bin/bash

INPUT=$(cat)
STATUS=$(echo "$INPUT" | jq -r '.status // empty')

if [ "$STATUS" != "completed" ]; then
    echo "{}"
    exit 0
fi

CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // empty')
CONTINUE_FLAG="/tmp/cursor_continue_sent_${CONVERSATION_ID}"

if [ -f "$CONTINUE_FLAG" ]; then
    echo "{}"
    exit 0
fi

touch "$CONTINUE_FLAG"

osascript <<EOF 2>/dev/null
tell application "Cursor"
    activate
end tell

delay 0.5

tell application "System Events"
    tell process "Cursor"
        keystroke "p" using {command down, shift down}
        delay 0.3
        keystroke "Focus Chat Followup"
        delay 0.2
        key code 36
        delay 0.3
        keystroke "continue"
        delay 0.2
        key code 36
        delay 0.2
        key code 36
    end tell
end tell
EOF

echo "{}"