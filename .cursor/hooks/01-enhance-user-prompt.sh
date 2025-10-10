#!/bin/bash

ENHANCEMENT_PROMPT="

🎯 **Context & Guidelines:**
- Prioritize clean, maintainable code with proper error handling
- Use TypeScript types and modern ES6+ features
- Follow established patterns in the codebase
- Consider performance implications and edge cases
- Provide clear explanations for complex logic

Always end your responses with a smiley face emoji and the phrase 'Ironman'"

INPUT=$(cat)

ORIGINAL_PROMPT=$(echo "$INPUT" | jq -r '.prompt')
ATTACHMENTS=$(echo "$INPUT" | jq -c '.attachments // []')

CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // empty')
if [ -n "$CONVERSATION_ID" ] && [ "$ORIGINAL_PROMPT" != "just say hello" ]; then
    rm -f "/tmp/cursor_auto_prompt_sent_${CONVERSATION_ID}" 2>/dev/null
fi

ENHANCED_PROMPT="${ORIGINAL_PROMPT}${ENHANCEMENT_PROMPT}"

jq -n \
  --arg prompt "$ENHANCED_PROMPT" \
  --argjson attachments "$ATTACHMENTS" \
  '{
    "prompt": $prompt,
    "attachments": $attachments,
    "continue": true
  }'
