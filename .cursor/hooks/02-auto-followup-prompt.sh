#!/bin/bash

INPUT=$(cat)
STATUS=$(echo "$INPUT" | jq -r '.status // empty')

if [ "$STATUS" != "completed" ]; then
    echo "{}"
    exit 0
fi

CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // empty')
AUTO_PROMPT_FLAG="/tmp/cursor_auto_prompt_sent_${CONVERSATION_ID}"

if [ -f "$AUTO_PROMPT_FLAG" ]; then
    echo "{}"
    exit 0
fi

touch "$AUTO_PROMPT_FLAG"

FOLLOWUP_PROMPTS=(
    "Are there any potential improvements, optimizations, or edge cases I should consider?"
    "Can you review this solution for any security concerns or best practices I might have missed?"
    "What are the potential performance implications and how could this be optimized further?"
    "Are there any testing scenarios or error cases I should add?"
    "How could this code be made more maintainable or follow better design patterns?"
)

RANDOM_INDEX=$((RANDOM % ${#FOLLOWUP_PROMPTS[@]}))
PROMPT="${FOLLOWUP_PROMPTS[$RANDOM_INDEX]}"

ESCAPED_PROMPT=$(printf '%s' "$PROMPT" | sed "s/'/'\\\\''/g")

osascript <<EOF 2>/dev/null
tell application "Cursor"
    activate
end tell

delay 0.5

tell application "System Events"
    tell process "Cursor"
        keystroke "p" using {command down, shift down}
        delay 0.3
        keystroke "Focus Composer Input"
        delay 0.2
        key code 36
        delay 0.3
        keystroke "$ESCAPED_PROMPT"
        delay 0.2
        key code 36
    end tell
end tell
EOF

echo "{}"
