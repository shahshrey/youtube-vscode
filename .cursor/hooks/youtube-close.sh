#!/bin/bash

# First check if YouTube panel is actually open by looking for the YouTube tab
YOUTUBE_TAB_EXISTS=$(osascript -e 'tell application "Cursor"
    activate
    tell application "System Events"
        tell process "Cursor"
            set tabNames to name of every window
            repeat with windowName in tabNames
                if windowName contains "YouTube" then
                    return "true"
                end if
            end repeat
            return "false"
        end tell
    end tell
end tell' 2>/dev/null || echo "false")

if [ "$YOUTUBE_TAB_EXISTS" = "true" ]; then
    # Close the YouTube tab using Cmd+W
    osascript -e 'tell application "Cursor" to activate' \
             -e 'tell application "System Events" to keystroke "w" using {command down}' 2>/dev/null || true
fi

echo "{}"
