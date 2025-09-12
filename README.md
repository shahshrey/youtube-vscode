# YouTube in VS Code

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/shreyshah.youtube-in-vscode)](https://marketplace.visualstudio.com/items?itemName=shreyshah.youtube-in-vscode)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/shreyshah.youtube-in-vscode)](https://marketplace.visualstudio.com/items?itemName=shreyshah.youtube-in-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful VS Code extension that seamlessly integrates YouTube directly into your development environment, allowing you to watch videos, browse content, and stay productive without leaving your editor.

## ✨ Features

- **🔍 Search & Browse**: Search and explore YouTube videos with an intuitive interface
- **📺 Embedded Player**: Watch videos in a clean, integrated player within VS Code
- **🔥 Trending Content**: Discover trending videos and popular content automatically on startup
- **📌 URL Management**: Save and organize your favorite YouTube URLs with custom names
- **🎯 Multiple View Options**: Choose between sidebar and full editor window viewing modes
- **⚡ Smart URL Parsing**: Direct playback support for various YouTube URL formats
- **🩳 YouTube Shorts Support**: Dedicated Shorts player with navigation controls and keyboard shortcuts
- **📝 Playlist Support**: Load and browse YouTube playlists
- **🔗 Channel Support**: Browse channel content by channel ID or handle
- **🔍 Search URL Support**: Load YouTube search results directly from search URLs
- **⌨️ Keyboard Navigation**: Navigate Shorts with arrow keys, W/S keys, or mouse wheel
- **♾️ Infinite Scrolling**: Seamlessly load more videos as you browse

## 🚀 Installation

1. Open VS Code
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "YouTube in VS Code"
4. Click "Install"

Alternatively, install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shreyshah.youtube-in-vscode).

## 🛠️ Setup

### Prerequisites

- **VS Code**: Version 1.74.0 or higher
- **YouTube Data API v3 Key**: Required for search and browse functionality

### Getting Your YouTube API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy your API key

### Configuration

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "YouTube in VS Code"
3. Enter your YouTube Data API v3 key in the `youtubeInVSCode.apiKey` field

## 🎮 Usage

### Opening YouTube

Choose from multiple ways to access YouTube:

- **Activity Bar**: Click the YouTube icon (▶️) in the Activity Bar for sidebar view
- **Command Palette**: 
  - `YouTube: Open YouTube Viewer` - Opens in sidebar
  - `YouTube: Open in Editor Window` - Opens in full editor view
  - `YouTube: Play from URL` - Interactive URL selection with saved URLs support
  - `YouTube: Open Editor and Play Default URL` - Opens editor and plays configured default URL

### Managing URLs

The extension supports various YouTube URL formats and provides flexible URL management:

**Supported URL Types:**
- **Regular Videos**: `https://www.youtube.com/watch?v=VIDEO_ID` or `https://youtu.be/VIDEO_ID`
- **YouTube Shorts**: `https://www.youtube.com/shorts/VIDEO_ID` (opens in dedicated Shorts player)
- **Playlists**: `https://www.youtube.com/playlist?list=PLAYLIST_ID`
- **Channels**: `https://www.youtube.com/channel/CHANNEL_ID` or `https://www.youtube.com/@CHANNEL_HANDLE`
- **Search URLs**: `https://www.youtube.com/results?search_query=QUERY` (loads search results)

**Saved URLs Configuration:**
1. Configure `youtubeInVSCode.savedUrls` in settings
2. Add objects with `name` and `url` properties
3. Access your saved URLs through the "Play from URL" command with an interactive picker

### YouTube Shorts Experience

When opening a YouTube Shorts URL, the extension provides a dedicated full-screen Shorts player with:

- **Navigation Controls**: Previous/Next buttons with visual indicators
- **Keyboard Shortcuts**: 
  - `↑` or `W` - Previous Short
  - `↓` or `S` - Next Short
  - `Escape` - Exit Shorts player
- **Mouse Wheel Navigation**: Scroll up/down to navigate between Shorts
- **Auto-loading Related Shorts**: Automatically loads related Shorts from the same channel

## ⚙️ Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `youtubeInVSCode.apiKey` | string | `""` | Your YouTube Data API v3 key (required for search functionality) |
| `youtubeInVSCode.defaultUrl` | string | `""` | Default YouTube URL to load when using Play from URL command |
| `youtubeInVSCode.savedUrls` | array | `[]` | List of saved YouTube URLs with custom names |

### Example Configuration

```json
{
  "youtubeInVSCode.apiKey": "your-api-key-here",
  "youtubeInVSCode.defaultUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "youtubeInVSCode.savedUrls": [
    {
      "name": "Coding Tutorials",
      "url": "https://www.youtube.com/channel/UCExample"
    },
    {
      "name": "Tech Reviews Playlist",
      "url": "https://www.youtube.com/playlist?list=PLExample"
    },
    {
      "name": "Funny Shorts",
      "url": "https://www.youtube.com/shorts/ExampleShort"
    },
    {
      "name": "JavaScript Search",
      "url": "https://www.youtube.com/results?search_query=javascript+tutorial"
    }
  ]
}
```

## 🎛️ Interface Features

### Video Grid
- **Responsive Design**: Automatically adjusts video grid layout based on available space
- **Video Thumbnails**: High-quality thumbnails with duration indicators
- **Video Metadata**: Shows title, channel name, view count, and publish date
- **Infinite Scrolling**: Automatically loads more videos as you scroll down

### Search & Filters
- **Real-time Search**: Search YouTube videos with instant results
- **Filter Chips**: Quick access to popular categories (Music, Gaming, Live, News, Sports, Learning, Fashion)
- **Trending on Startup**: Automatically loads trending videos when the extension opens

### Player Controls
- **Embedded YouTube Player**: Full-featured YouTube player with all standard controls
- **Error Handling**: Graceful error handling with user-friendly error messages
- **Autoplay Support**: Videos start playing automatically when selected

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

- Check the [Issues](https://github.com/shahshrey/youtube-vscode/issues) page
- Create a new issue with detailed information about the problem
- Include your VS Code version and extension version

## 🔄 Changelog

### [0.0.1] - Initial Release

- **Core Features**: YouTube integration with embedded player
- **Search & Browse**: Video search with trending content on startup
- **Multiple Views**: Sidebar and full editor window support
- **URL Support**: Smart parsing for videos, Shorts, playlists, channels, and search URLs
- **Shorts Player**: Dedicated full-screen Shorts experience with keyboard/mouse navigation
- **Playlist Support**: Browse and play YouTube playlists
- **Channel Support**: Access channel content via channel ID or handle
- **Interactive URL Management**: Quick picker for saved URLs with custom names
- **Infinite Scrolling**: Seamless content loading
- **Responsive Design**: Adaptive video grid layout
- **Error Handling**: Graceful error handling with user feedback

---

**Enjoy coding with YouTube! 🎉**
