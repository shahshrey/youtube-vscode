#!/bin/bash

INPUT=$(cat)
STATUS=$(echo "$INPUT" | jq -r '.status // empty')

if [ "$STATUS" != "completed" ]; then
    echo "{}"
    exit 0
fi

NEW_CHAT_PROMPTS=(
    "🔍 Code Review: Analyze the recent changes and suggest architectural improvements"
    "🚀 Next Steps: What should be the next development priorities for this project?"
    "🧪 Testing Strategy: What testing approach would you recommend for the recent changes?"
    "📚 Documentation: What documentation should be created or updated based on recent work?"
    "🔧 Refactoring: Are there any refactoring opportunities to improve code quality?"
    "⚡ Performance: How can we optimize the performance of the recent implementations?"
    "🛡️ Security: What security considerations should be addressed in this codebase?"
    "🎯 Best Practices: How well does this code follow current best practices and standards?"
)

RANDOM_INDEX=$((RANDOM % ${#NEW_CHAT_PROMPTS[@]}))
PROMPT="${NEW_CHAT_PROMPTS[$RANDOM_INDEX]}"

ENCODED_PROMPT=$(printf '%s' "$PROMPT" | jq -sRr @uri)

open -g "cursor://anysphere.cursor-deeplink/prompt?text=$ENCODED_PROMPT&autoSubmit=false"

echo "{}"
