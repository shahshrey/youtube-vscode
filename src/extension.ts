import * as vscode from 'vscode';
import axios from 'axios';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_VIDEOS = `${YT_API_BASE}/videos`;
const YT_SEARCH = `${YT_API_BASE}/search`;
const YT_PLAYLIST_ITEMS = `${YT_API_BASE}/playlistItems`;

type LoadFromUrlMessage = { command: 'loadFromUrl'; url: string; pageToken?: string };
type SearchMessage = { command: 'search'; query: string; pageToken?: string };
type GetTrendingMessage = { command: 'getTrending' };
type WebviewToExtensionMessage = LoadFromUrlMessage | SearchMessage | GetTrendingMessage;

type ApiKeyRequiredResponse = { command: 'apiKeyRequired' };
type PlayVideoResponse = { command: 'playVideo'; videoId: string };
interface VideoItem {
	id: { videoId: string } | string;
	snippet: {
		title: string;
		channelTitle: string;
		publishedAt: string;
		channelId: string;
		thumbnails: {
			high: { url: string };
		};
		resourceId?: { videoId: string };
	};
	statistics?: {
		viewCount: string;
	};
}

type LoadShortsResponse = { command: 'loadShorts'; shorts: VideoItem[]; currentIndex: number };
type PagedResults = { results: VideoItem[]; nextPageToken?: string; totalResults?: number };
type SearchResultsResponse = { command: 'searchResults' } & PagedResults;
type TrendingResultsResponse = { command: 'trendingResults' } & PagedResults;
type ExtensionToWebviewMessage =
	| ApiKeyRequiredResponse
	| PlayVideoResponse
	| LoadShortsResponse
	| SearchResultsResponse
	| TrendingResultsResponse
	| { command: 'loadFromUrl'; url: string };

interface ParsedYouTubeUrl {
	type: 'search' | 'video' | 'shorts' | 'playlist' | 'channel' | 'unknown';
	searchQuery?: string;
	videoId?: string;
	playlistId?: string;
	channelId?: string;
	channelName?: string;
	filters?: string;
}

function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
	try {
		const urlObj = new URL(url);
		
		if (urlObj.hostname !== 'www.youtube.com' && urlObj.hostname !== 'youtube.com' && urlObj.hostname !== 'youtu.be') {
			return { type: 'unknown' };
		}

		if (urlObj.pathname === '/results') {
			const searchQuery = urlObj.searchParams.get('search_query');
			const filters = urlObj.searchParams.get('sp');
			return {
				type: 'search',
				searchQuery: searchQuery ? decodeURIComponent(searchQuery.replace(/\+/g, ' ')) : undefined,
				filters: filters || undefined
			};
		}

		if (urlObj.pathname === '/watch') {
			const videoId = urlObj.searchParams.get('v');
			const playlistId = urlObj.searchParams.get('list');
			return {
				type: videoId ? 'video' : 'playlist',
				videoId: videoId || undefined,
				playlistId: playlistId || undefined
			};
		}

		if (urlObj.hostname === 'youtu.be') {
			const videoId = urlObj.pathname.slice(1);
			return {
				type: 'video',
				videoId
			};
		}

		if (urlObj.pathname.startsWith('/shorts/')) {
			const videoId = urlObj.pathname.replace('/shorts/', '');
			return {
				type: 'shorts',
				videoId
			};
		}

		if (urlObj.pathname.startsWith('/playlist')) {
			const playlistId = urlObj.searchParams.get('list');
			return {
				type: 'playlist',
				playlistId: playlistId || undefined
			};
		}

		if (urlObj.pathname.startsWith('/channel/')) {
			const channelId = urlObj.pathname.replace('/channel/', '');
			return {
				type: 'channel',
				channelId
			};
		}

		if (urlObj.pathname.startsWith('/c/') || urlObj.pathname.startsWith('/@')) {
			const channelName = urlObj.pathname.replace(/^\/[c@]\//, '');
			return {
				type: 'channel',
				channelName
			};
		}

		return { type: 'unknown' };
	} catch (error) {
		return { type: 'unknown' };
	}
}

function getWebviewContent(webview: vscode.Webview): string {
	const csp = `
		default-src 'none';
		img-src https: data: blob:;
		style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
		font-src https://fonts.googleapis.com https://fonts.gstatic.com;
		script-src ${webview.cspSource} 'unsafe-inline' https://www.youtube.com;
		frame-src https://www.youtube.com https://www.youtube-nocookie.com;
		connect-src https://www.googleapis.com;
	`;

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta http-equiv="Content-Security-Policy" content="${csp}">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>YouTube in VS Code</title>
		<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
		<style>
			:root {
				font-size: 16px;
				--yt-spec-base-background: #0f0f0f;
				--yt-spec-text-primary: #fff;
				--yt-spec-text-secondary: #aaa;
				--yt-spec-brand-background-solid: #212121;
				--yt-spec-brand-background-primary: rgba(33, 33, 33, 0.98);
				--yt-spec-brand-background-secondary: rgba(33, 33, 33, 0.95);
				--yt-spec-general-background-a: #181818;
				--yt-spec-call-to-action: #3ea6ff;
				--yt-spec-text-primary-inverse: #0f0f0f;
				--yt-spec-brand-link-text: #ff0000;
				--yt-spec-textbox-background: #121212;
				--yt-spec-text-input-field-suggestion-highlight-background: #263850;
				--yt-spec-call-to-action-inverse: #065fd4;
				--yt-spec-brand-icon-inactive: #fff;
				--yt-spec-brand-icon-active: #fff;
				--yt-spec-brand-button-background: #c00;
				--yt-spec-brand-link-text: #ff0000;
				--yt-spec-filled-button-focus-outline: rgba(0, 0, 0, 0.6);
				--yt-spec-call-to-action-button-focus-outline: rgba(62, 166, 255, 0.3);
			}

			body {
				background: var(--yt-spec-base-background);
				color: var(--yt-spec-text-primary);
				padding: 0;
				margin: 0;
				height: 100vh;
				display: flex;
				flex-direction: column;
				font-family: 'Roboto', sans-serif;
				font-size: 14px;
				line-height: 1.4;
				overflow: hidden;
			}

			.header {
				position: sticky;
				top: 0;
				z-index: 100;
				background: var(--yt-spec-base-background);
				padding: 8px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.1);
			}

			.top-bar {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				margin-bottom: 0.5rem;
			}

			.logo-container {
				display: flex;
				align-items: center;
				gap: 0;
				color: #fff;
				text-decoration: none;
				flex-shrink: 0;
				margin: 0;
				padding: 0;
			}

			.logo-container svg {
				width: 2rem;
				height: 2rem;
				fill: currentColor;
				margin: 0;
				padding: 0;
				display: block;
			}

			.search-container {
				display: flex;
				flex: 1;
				min-width: 0;
				height: 2rem;
				margin: 0;
				padding: 0;
			}

			.search-container input {
				flex: 1;
				min-width: 0;
				padding: 0 0.75rem;
				background: var(--yt-spec-textbox-background);
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-radius: 1.25rem 0 0 1.25rem;
				color: var(--yt-spec-text-primary);
				font-size: 1rem;
				outline: none;
				height: 2rem;
			}

			.search-container input:focus {
				border-color: var(--yt-spec-call-to-action);
			}

			.search-container button {
				width: 2.5rem;
				height: 2rem;
				background: var(--yt-spec-brand-background-solid);
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-left: none;
				border-radius: 0 1.25rem 1.25rem 0;
				color: var(--yt-spec-text-primary);
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 0;
			}

			.search-container button:hover {
				background: #303030;
			}

			.filter-container {
				display: flex;
				gap: 8px;
				overflow-x: auto;
				padding: 4px 0;
				scrollbar-width: none;
				-ms-overflow-style: none;
			}

			.filter-container::-webkit-scrollbar {
				display: none;
			}

			.filter-chip {
				background: var(--yt-spec-brand-background-solid);
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-radius: 16px;
				color: var(--yt-spec-text-primary);
				padding: 4px 12px;
				font-size: 14px;
				white-space: nowrap;
				cursor: pointer;
				transition: background-color 0.2s;
			}

			.filter-chip:hover {
				background: #303030;
			}

			.filter-chip.active {
				background: var(--yt-spec-text-primary);
				color: var(--yt-spec-text-primary-inverse);
			}

			#active-video {
				width: 100%;
				background: #000;
				aspect-ratio: 16/9;
				border: none;
				display: none;
			}

			#active-video.visible {
				display: block;
			}

			.shorts-container {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100vh;
				background: var(--yt-spec-base-background);
				z-index: 1000;
			}

			.shorts-player-wrapper {
				position: relative;
				width: 100%;
				height: 100%;
				display: flex;
				flex-direction: column;
			}

			#shorts-player {
				flex: 1;
				width: 100%;
				background: #000;
			}

			.shorts-info {
				position: absolute;
				bottom: 80px;
				left: 16px;
				right: 16px;
				color: white;
				text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
			}

			.shorts-title {
				font-size: 16px;
				font-weight: 500;
				margin-bottom: 8px;
				line-height: 1.3;
				max-height: 3.9em;
				overflow: hidden;
				display: -webkit-box;
				-webkit-line-clamp: 3;
				-webkit-box-orient: vertical;
			}

			.shorts-channel {
				font-size: 14px;
				color: rgba(255, 255, 255, 0.8);
			}

			.shorts-controls {
				position: absolute;
				bottom: 20px;
				left: 0;
				right: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 20px;
				padding: 0 16px;
			}

			.shorts-nav-btn {
				background: rgba(255, 255, 255, 0.1);
				border: 1px solid rgba(255, 255, 255, 0.3);
				border-radius: 50%;
				width: 48px;
				height: 48px;
				display: flex;
				align-items: center;
				justify-content: center;
				color: white;
				cursor: pointer;
				transition: background-color 0.2s;
				backdrop-filter: blur(8px);
			}

			.shorts-nav-btn:hover {
				background: rgba(255, 255, 255, 0.2);
			}

			.shorts-nav-btn:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.shorts-counter {
				color: white;
				font-size: 14px;
				text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
				background: rgba(0, 0, 0, 0.3);
				padding: 8px 12px;
				border-radius: 16px;
				backdrop-filter: blur(8px);
			}

			.content-container {
				flex: 1;
				overflow-y: auto;
				padding: 16px;
				scrollbar-width: thin;
				scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
			}

			.content-container::-webkit-scrollbar {
				width: 8px;
			}

			.content-container::-webkit-scrollbar-track {
				background: transparent;
			}

			.content-container::-webkit-scrollbar-thumb {
				background-color: rgba(255, 255, 255, 0.3);
				border-radius: 4px;
			}

			.video-grid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
				gap: 16px;
			}

			.video-item {
				cursor: pointer;
				transition: transform 0.2s;
			}

			.video-item:hover {
				transform: scale(1.02);
			}

			.thumbnail-container {
				position: relative;
				width: 100%;
				padding-top: 56.25%;
				background: var(--yt-spec-brand-background-solid);
				border-radius: 8px;
				overflow: hidden;
			}

			.thumbnail {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.duration {
				position: absolute;
				bottom: 4px;
				right: 4px;
				background: rgba(0, 0, 0, 0.8);
				color: #fff;
				padding: 2px 4px;
				border-radius: 2px;
				font-size: 12px;
			}

			.video-info {
				padding: 8px 0;
			}

			.video-title {
				font-weight: 500;
				margin-bottom: 4px;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}

			.channel-name {
				color: var(--yt-spec-text-secondary);
				font-size: 13px;
				margin-bottom: 2px;
			}

			.video-meta {
				color: var(--yt-spec-text-secondary);
				font-size: 13px;
				display: flex;
				gap: 4px;
			}

			.loading {
				text-align: center;
				padding: 16px;
				color: var(--yt-spec-text-secondary);
			}

			@media (max-width: 480px) {
				.video-grid {
					grid-template-columns: 1fr;
				}

				.search-container input {
					font-size: 16px;
				}
			}
		</style>
	</head>
	<body>
		<div class="header">
			<div class="top-bar">
				<div class="logo-container">
					<svg viewBox="0 0 30 20">
						<g viewBox="0 0 90 20" preserveAspectRatio="xMidYMid meet">
							<g>
								<path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" fill="#FF0000"></path>
								<path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"></path>
							</g>
						</g>
					</svg>
				</div>
				<div class="search-container">
					<input type="text" id="searchInput" placeholder="Search">
					<button onclick="searchVideos()">
						<svg height="24" viewBox="0 0 24 24" width="24" focusable="false">
							<path d="M20.87 20.17l-5.59-5.59C16.35 13.35 17 11.75 17 10c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.75 0 3.35-.65 4.58-1.71l5.59 5.59.7-.71zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="currentColor"></path>
						</svg>
					</button>
				</div>
			</div>
			<div class="filter-container">
				<div class="filter-chip active">All</div>
				<div class="filter-chip">Music</div>
				<div class="filter-chip">Gaming</div>
				<div class="filter-chip">Live</div>
				<div class="filter-chip">News</div>
				<div class="filter-chip">Sports</div>
				<div class="filter-chip">Learning</div>
				<div class="filter-chip">Fashion</div>
			</div>
		</div>

		<iframe id="active-video" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>

		<div id="shorts-container" class="shorts-container" style="display: none;">
			<div class="shorts-player-wrapper">
				<iframe id="shorts-player" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>
				<div class="shorts-info">
					<div class="shorts-title"></div>
					<div class="shorts-channel"></div>
				</div>
				<div class="shorts-controls">
					<button id="prev-short" class="shorts-nav-btn">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
						</svg>
					</button>
					<div class="shorts-counter">
						<span id="current-short">1</span> / <span id="total-shorts">1</span>
					</div>
					<button id="next-short" class="shorts-nav-btn">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<div class="content-container">
			<div id="results" class="video-grid"></div>
			<div id="loading" class="loading" style="display: none;">Loading more videos...</div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();
			let nextPageToken = '';
			let isLoading = false;
			let currentQuery = '';
			let shortsData = [];
			let currentShortsIndex = 0;
			
			// Load trending videos on startup
			window.addEventListener('load', () => {
				document.getElementById('loading').style.display = 'block';
				vscode.postMessage({ command: 'getTrending' });
			});

			function searchVideos(pageToken = '') {
				const query = document.getElementById('searchInput').value;
				if (!pageToken) {
					currentQuery = query;
					document.getElementById('results').innerHTML = '';
					window.scrollTo(0, 0);
				}
				
				if (query === currentQuery || pageToken) {
					isLoading = true;
					document.getElementById('loading').style.display = 'block';
					vscode.postMessage({
						command: 'search',
						query: currentQuery || query,
						pageToken: pageToken
					});
				}
			}

			document.getElementById('searchInput').addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					searchVideos();
				}
			});

			function formatDate(isoDate) {
				const date = new Date(isoDate);
				const now = new Date();
				const diff = now.getTime() - date.getTime();
				
				const minute = 60 * 1000;
				const hour = minute * 60;
				const day = hour * 24;
				const week = day * 7;
				const month = day * 30;
				const year = day * 365;
				
				if (diff < hour) {
					const mins = Math.floor(diff / minute);
					return \`\${mins} minute\${mins === 1 ? '' : 's'} ago\`;
				} else if (diff < day) {
					const hours = Math.floor(diff / hour);
					return \`\${hours} hour\${hours === 1 ? '' : 's'} ago\`;
				} else if (diff < week) {
					const days = Math.floor(diff / day);
					return \`\${days} day\${days === 1 ? '' : 's'} ago\`;
				} else if (diff < month) {
					const weeks = Math.floor(diff / week);
					return \`\${weeks} week\${weeks === 1 ? '' : 's'} ago\`;
				} else if (diff < year) {
					const months = Math.floor(diff / month);
					return \`\${months} month\${months === 1 ? '' : 's'} ago\`;
				} else {
					const years = Math.floor(diff / year);
					return \`\${years} year\${years === 1 ? '' : 's'} ago\`;
				}
			}

			function formatViews(viewCount) {
				if (viewCount >= 1000000) {
					return \`\${Math.floor(viewCount / 1000000)}M views\`;
				} else if (viewCount >= 1000) {
					return \`\${Math.floor(viewCount / 1000)}K views\`;
				} else {
					return \`\${viewCount} views\`;
				}
			}

			function playVideo(videoId) {
				const player = document.getElementById('active-video');
				const embedUrl = \`https://www.youtube-nocookie.com/embed/\${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1&cc_load_policy=1&iv_load_policy=3&autohide=0&controls=1\`;
				player.src = embedUrl;
				player.classList.add('visible');
				window.scrollTo(0, 0);
				
				// Add error handling
				player.onerror = function() {
					console.error('Failed to load video:', videoId);
					const errorMsg = document.createElement('div');
					errorMsg.style.cssText = 'color: #ff4444; text-align: center; padding: 20px;';
					errorMsg.textContent = 'Error loading video. Please try another video.';
					player.parentNode.insertBefore(errorMsg, player.nextSibling);
				};
			}

			// Handle filter chips
			document.querySelectorAll('.filter-chip').forEach(chip => {
				chip.addEventListener('click', () => {
					document.querySelector('.filter-chip.active').classList.remove('active');
					chip.classList.add('active');
					// TODO: Implement filter functionality
				});
			});

			// Handle Shorts navigation
			document.getElementById('prev-short').addEventListener('click', () => {
				navigateShorts('prev');
			});

			document.getElementById('next-short').addEventListener('click', () => {
				navigateShorts('next');
			});

			// Handle keyboard navigation for Shorts
			document.addEventListener('keydown', (e) => {
				if (document.getElementById('shorts-container').style.display === 'block') {
					switch(e.key) {
						case 'ArrowUp':
						case 'w':
						case 'W':
							e.preventDefault();
							navigateShorts('prev');
							break;
						case 'ArrowDown':
						case 's':
						case 'S':
							e.preventDefault();
							navigateShorts('next');
							break;
						case 'Escape':
							e.preventDefault();
							hideShorts();
							break;
					}
				}
			});

			// Handle scroll wheel navigation for Shorts
			document.getElementById('shorts-container').addEventListener('wheel', (e) => {
				if (document.getElementById('shorts-container').style.display === 'block') {
					e.preventDefault();
					if (e.deltaY > 0) {
						navigateShorts('next');
					} else if (e.deltaY < 0) {
						navigateShorts('prev');
					}
				}
			}, { passive: false });

			// Infinite scrolling
			document.querySelector('.content-container').addEventListener('scroll', (e) => {
				if (isLoading) return;
				
				const {scrollTop, scrollHeight, clientHeight} = e.target;
				if (scrollTop + clientHeight >= scrollHeight - 100 && nextPageToken) {
					searchVideos(nextPageToken);
				}
			});

			function loadFromUrl(url) {
				document.getElementById('loading').style.display = 'block';
				document.getElementById('results').innerHTML = '';
				vscode.postMessage({
					command: 'loadFromUrl',
					url: url
				});
			}

			function showShorts(shorts, startIndex = 0) {
				shortsData = shorts;
				currentShortsIndex = startIndex;
				
				const shortsContainer = document.getElementById('shorts-container');
				const contentContainer = document.querySelector('.content-container');
				const activeVideo = document.getElementById('active-video');
				
				shortsContainer.style.display = 'block';
				contentContainer.style.display = 'none';
				activeVideo.classList.remove('visible');
				
				updateShortsDisplay();
			}

			function hideShorts() {
				const shortsContainer = document.getElementById('shorts-container');
				const contentContainer = document.querySelector('.content-container');
				
				shortsContainer.style.display = 'none';
				contentContainer.style.display = 'flex';
			}

			function updateShortsDisplay() {
				if (!shortsData.length) return;
				
				const currentShort = shortsData[currentShortsIndex];
				const shortsPlayer = document.getElementById('shorts-player');
				const shortsTitle = document.querySelector('.shorts-title');
				const shortsChannel = document.querySelector('.shorts-channel');
				const currentShortSpan = document.getElementById('current-short');
				const totalShortsSpan = document.getElementById('total-shorts');
				const prevBtn = document.getElementById('prev-short');
				const nextBtn = document.getElementById('next-short');
				
				const videoId = currentShort.id?.videoId || currentShort.id;
				const embedUrl = \`https://www.youtube-nocookie.com/embed/\${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1&controls=1&loop=1&playlist=\${videoId}\`;
				
				shortsPlayer.src = embedUrl;
				shortsTitle.textContent = currentShort.snippet.title;
				shortsChannel.textContent = currentShort.snippet.channelTitle;
				currentShortSpan.textContent = currentShortsIndex + 1;
				totalShortsSpan.textContent = shortsData.length;
				
				prevBtn.disabled = currentShortsIndex === 0;
				nextBtn.disabled = currentShortsIndex === shortsData.length - 1;
			}

			function navigateShorts(direction) {
				if (direction === 'next' && currentShortsIndex < shortsData.length - 1) {
					currentShortsIndex++;
					updateShortsDisplay();
				} else if (direction === 'prev' && currentShortsIndex > 0) {
					currentShortsIndex--;
					updateShortsDisplay();
				}
			}

			window.addEventListener('message', event => {
				const message = event.data;
				switch (message.command) {
					case 'loadFromUrl':
						if (message.url) {
							loadFromUrl(message.url);
						}
						break;
					case 'loadShorts':
						if (message.shorts && message.shorts.length > 0) {
							showShorts(message.shorts, message.currentIndex || 0);
						}
						break;
					case 'playVideo':
						if (message.videoId) {
							playVideo(message.videoId);
						}
						break;
					case 'searchResults':
					case 'trendingResults':
						isLoading = false;
						document.getElementById('loading').style.display = 'none';
						nextPageToken = message.nextPageToken;
						
						const resultsContainer = document.getElementById('results');
						if (!message.pageToken) {
							resultsContainer.innerHTML = '';
						}

						message.results.forEach(video => {
							const videoElement = document.createElement('div');
							videoElement.className = 'video-item';
							videoElement.onclick = () => playVideo(video.id.videoId || video.id);
							
							const viewCount = video.statistics ? formatViews(video.statistics.viewCount) : '';
							
							videoElement.innerHTML = \`
								<div class="thumbnail-container">
									<img class="thumbnail" src="\${video.snippet.thumbnails.high.url}" alt="\${video.snippet.title}">
									<div class="duration"></div>
								</div>
								<div class="video-info">
									<div class="video-title">\${video.snippet.title}</div>
									<div class="channel-name">\${video.snippet.channelTitle}</div>
									<div class="video-meta">
										\${viewCount ? \`<span>\${viewCount}</span> • \` : ''}
										<span>\${formatDate(video.snippet.publishedAt)}</span>
									</div>
								</div>
							\`;
							
							resultsContainer.appendChild(videoElement);
						});
						break;
				}
			});
		</script>
	</body>
	</html>`;
}

async function ensureApiKey(postMessageCallback: (response: ExtensionToWebviewMessage) => void): Promise<string | undefined> {
	const config = vscode.workspace.getConfiguration('youtubeInVSCode');
	const apiKey = config.get<string>('apiKey');
	if (apiKey) return apiKey;
	postMessageCallback({ command: 'apiKeyRequired' });
	const response = await vscode.window.showInformationMessage(
		'YouTube API Key is required. Would you like to set it up now?',
		'Yes',
		'No'
	);
	if (response === 'Yes') {
		vscode.commands.executeCommand('workbench.action.openSettings', 'youtubeInVSCode.apiKey');
	}
	return undefined;
}

async function handleWebviewMessage(message: WebviewToExtensionMessage, postMessageCallback: (response: ExtensionToWebviewMessage) => void) {
	switch (message.command) {
		case 'loadFromUrl':
			try {
				const apiKey = await ensureApiKey(postMessageCallback);
				if (!apiKey) return;

				const parsedUrl = parseYouTubeUrl(message.url);
				
				if (parsedUrl.type === 'search' && parsedUrl.searchQuery) {
					const response = await axios.get(YT_SEARCH, {
						params: {
							part: 'snippet',
							maxResults: 50,
							q: parsedUrl.searchQuery,
							key: apiKey,
							type: 'video',
							pageToken: message.pageToken || ''
						}
					});
					postMessageCallback({
						command: 'searchResults',
						results: response.data.items,
						nextPageToken: response.data.nextPageToken,
						totalResults: response.data.pageInfo.totalResults
					});
				} else if (parsedUrl.type === 'video' && parsedUrl.videoId) {
					const response = await axios.get(YT_VIDEOS, {
						params: {
							part: 'snippet,statistics',
							id: parsedUrl.videoId,
							key: apiKey
						}
					});
					if (response.data.items && response.data.items.length > 0) {
						postMessageCallback({
							command: 'playVideo',
							videoId: parsedUrl.videoId
						});
					}
				} else if (parsedUrl.type === 'shorts' && parsedUrl.videoId) {
					const videoResponse = await axios.get(YT_VIDEOS, {
						params: {
							part: 'snippet,statistics',
							id: parsedUrl.videoId,
							key: apiKey
						}
					});
					
					if (videoResponse.data.items && videoResponse.data.items.length > 0) {
						const video = videoResponse.data.items[0];
						
						try {
							const relatedResponse = await axios.get(YT_SEARCH, {
								params: {
									part: 'snippet',
									channelId: video.snippet.channelId,
									maxResults: 20,
									type: 'video',
									videoDuration: 'short',
									key: apiKey,
									order: 'date'
								}
							});
							
							const shortsVideos = [video, ...relatedResponse.data.items.filter((item: VideoItem) => {
							const videoId = typeof item.id === 'string' ? item.id : item.id.videoId;
							return videoId !== parsedUrl.videoId;
						})];
							
							postMessageCallback({
								command: 'loadShorts',
								shorts: shortsVideos,
								currentIndex: 0
							});
						} catch (relatedError) {
							postMessageCallback({
								command: 'loadShorts',
								shorts: [video],
								currentIndex: 0
							});
						}
					}
				} else if (parsedUrl.type === 'playlist' && parsedUrl.playlistId) {
					const response = await axios.get(YT_PLAYLIST_ITEMS, {
						params: {
							part: 'snippet',
							maxResults: 50,
							playlistId: parsedUrl.playlistId,
							key: apiKey,
							pageToken: message.pageToken || ''
						}
					});
					postMessageCallback({
						command: 'searchResults',
						results: response.data.items.map((item: VideoItem) => ({
							...item,
							id: { videoId: item.snippet.resourceId?.videoId || '' }
						})),
						nextPageToken: response.data.nextPageToken,
						totalResults: response.data.pageInfo.totalResults
					});
				} else {
					vscode.window.showErrorMessage('Unsupported YouTube URL format');
				}
			} catch (error) {
				vscode.window.showErrorMessage('Failed to load from YouTube URL: ' + error);
			}
			break;
		case 'search':
			try {
				const apiKey = await ensureApiKey(postMessageCallback);
				if (!apiKey) return;

				const response = await axios.get(YT_SEARCH, {
					params: {
						part: 'snippet',
						maxResults: 50,
						q: message.query,
						key: apiKey,
						type: 'video',
						pageToken: message.pageToken || ''
					}
				});
				postMessageCallback({
					command: 'searchResults',
					results: response.data.items,
					nextPageToken: response.data.nextPageToken,
					totalResults: response.data.pageInfo.totalResults
				});
			} catch (error) {
				vscode.window.showErrorMessage('Failed to search YouTube: ' + error);
			}
			break;
		case 'getTrending':
			try {
				const apiKey = await ensureApiKey(postMessageCallback);
				if (!apiKey) return;

				const response = await axios.get(YT_VIDEOS, {
					params: {
						part: 'snippet,statistics',
						chart: 'mostPopular',
						maxResults: 50,
						key: apiKey,
						regionCode: 'US'
					}
				});
				postMessageCallback({
					command: 'trendingResults',
					results: response.data.items,
					nextPageToken: response.data.nextPageToken,
					totalResults: response.data.pageInfo.totalResults
				});
			} catch (error) {
				vscode.window.showErrorMessage('Failed to fetch trending videos: ' + error);
			}
			break;
	}
}

class YouTubePanel {
	public static currentPanel: YouTubePanel | undefined;
	public static readonly viewType = 'youtubeInEditor';
	
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (YouTubePanel.currentPanel) {
			YouTubePanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			YouTubePanel.viewType,
			'YouTube',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		YouTubePanel.currentPanel = new YouTubePanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._update();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async message => {
				handleWebviewMessage(message as WebviewToExtensionMessage, (response: ExtensionToWebviewMessage) => {
					this._panel.webview.postMessage(response);
				});
			},
			null,
			this._disposables
		);
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.title = 'YouTube';
		this._panel.webview.html = getWebviewContent(webview);
	}

	public sendMessage(message: ExtensionToWebviewMessage) {
		this._panel.webview.postMessage(message);
	}

	public dispose() {
		YouTubePanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}

class YouTubeViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: []
		};

		webviewView.webview.html = getWebviewContent(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async message => {
			handleWebviewMessage(message as WebviewToExtensionMessage, (response: ExtensionToWebviewMessage) => {
				this._view?.webview.postMessage(response);
			});
		});
	}

}

export function activate(context: vscode.ExtensionContext) {
	const sidebarProvider = new YouTubeViewProvider(context.extensionUri);
	const explorerProvider = new YouTubeViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('youtube-sidebar', sidebarProvider),
		vscode.window.registerWebviewViewProvider('youtube-explorer', explorerProvider)
	);

	// Command to open YouTube in sidebar
	context.subscriptions.push(
		vscode.commands.registerCommand('youtube-in-vs-code.openYouTube', () => {
			vscode.commands.executeCommand('workbench.view.extension.youtube-sidebar-view');
		})
	);

	// Command to open YouTube in editor
	context.subscriptions.push(
		vscode.commands.registerCommand('youtube-in-vs-code.openInEditor', () => {
			YouTubePanel.createOrShow(context.extensionUri);
		})
	);

	// Command to open in editor and play default URL in one go
	context.subscriptions.push(
		vscode.commands.registerCommand('youtube-in-vs-code.openAndPlayDefault', async () => {
			const config = vscode.workspace.getConfiguration('youtubeInVSCode');
			const defaultUrl = config.get<string>('defaultUrl') || '';
			
			if (!defaultUrl) {
				vscode.window.showErrorMessage('No default URL configured. Please set youtubeInVSCode.defaultUrl in settings.');
				return;
			}

			YouTubePanel.createOrShow(context.extensionUri);
			
			// Small delay to ensure panel is ready
			setTimeout(() => {
				if (YouTubePanel.currentPanel) {
					YouTubePanel.currentPanel.sendMessage({
						command: 'loadFromUrl',
						url: defaultUrl
					});
				}
			}, 100);
		})
	);

	// Command to close YouTube panel
	context.subscriptions.push(
		vscode.commands.registerCommand('youtube-in-vs-code.close', async () => {
			if (YouTubePanel.currentPanel) {
				YouTubePanel.currentPanel.dispose();
				// Only close the editor if we actually had a panel open
				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			}
		})
	);

	// Command to play from URL
	context.subscriptions.push(
		vscode.commands.registerCommand('youtube-in-vs-code.playFromUrl', async () => {
			const config = vscode.workspace.getConfiguration('youtubeInVSCode');
			const defaultUrl = config.get<string>('defaultUrl') || '';
			const savedUrls = config.get<Array<{name: string, url: string}>>('savedUrls') || [];

			let url = '';
			
			if (savedUrls.length > 0) {
				const options = savedUrls.map(item => ({
					label: item.name,
					detail: item.url,
					url: item.url
				}));
				
				if (defaultUrl) {
					options.unshift({
						label: 'Default URL',
						detail: defaultUrl,
						url: defaultUrl
					});
				}
				
				options.push({
					label: '$(edit) Enter custom URL...',
					detail: 'Type a YouTube URL',
					url: ''
				});

				const selected = await vscode.window.showQuickPick(options, {
					placeHolder: 'Select a YouTube URL to play'
				});

				if (!selected) {
					return;
				}

				if (selected.url) {
					url = selected.url;
				} else {
					const inputUrl = await vscode.window.showInputBox({
						prompt: 'Enter YouTube URL',
						placeHolder: 'https://www.youtube.com/...'
					});
					if (!inputUrl) {
						return;
					}
					url = inputUrl;
				}
			} else {
				if (defaultUrl) {
					const useDefault = await vscode.window.showQuickPick(
						['Use default URL', 'Enter custom URL'],
						{ placeHolder: 'Choose URL option' }
					);
					
					if (!useDefault) {
						return;
					}
					
					if (useDefault === 'Use default URL') {
						url = defaultUrl;
					} else {
						const inputUrl = await vscode.window.showInputBox({
							prompt: 'Enter YouTube URL',
							placeHolder: 'https://www.youtube.com/...'
						});
						if (!inputUrl) {
							return;
						}
						url = inputUrl;
					}
				} else {
					const inputUrl = await vscode.window.showInputBox({
						prompt: 'Enter YouTube URL',
						placeHolder: 'https://www.youtube.com/...'
					});
					if (!inputUrl) {
						return;
					}
					url = inputUrl;
				}
			}

			YouTubePanel.createOrShow(context.extensionUri);
			
			if (YouTubePanel.currentPanel) {
				YouTubePanel.currentPanel.sendMessage({
					command: 'loadFromUrl',
					url: url
				});
			}
		})
	);
}

export function deactivate(): void {
	// Extension cleanup logic would go here
}
