# AI Summary Article

A Chrome extension that extracts article text from the current tab and generates a summary using Google's Gemini Generative Language API.

## Features

- Extracts text from `article`, `main`, `section`, `p`, or `body` content on the current page
- Supports three summary styles:
  - `brief` — short 2-3 sentence summary
  - `detail` — more detailed overview of the main points
  - `bullets` — concise key points in bullet form
- Copy generated summary to clipboard with one click
- Stores Gemini API key securely in `chrome.storage.sync`
- Includes an options page for saving, testing, and clearing the API key

## Installation

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this extension folder: `ai summarising`

## Usage

1. Click the extension icon to open the popup
2. Choose the summary type from the dropdown
3. Click `Summarize`
4. Wait for the result to appear in the popup
5. Click `Copy` to copy the summary to the clipboard

## Configuration

1. Open the extension options page via `chrome://extensions/` > `Details` > `Extension options`
2. Enter your Gemini API key
3. Click `Save`
4. Optionally click `Test Key` to verify the API key works

## Required Permissions

- `scripting`
- `activeTab`
- `storage`
- `<all_urls>` host permission (for content script injection and page text extraction)

## Files

- `manifest.json` — extension configuration
- `popup.html` / `popup.js` — main user interface and summary logic
- `background.js` — service worker for install behavior
- `content.js` — page text extraction
- `options.html` / `options.js` — API key management UI

## Notes

- This extension uses Gemini API endpoints, so you must have a valid Gemini API key and the necessary access enabled for your Google Cloud project.
- The summarization request is sent directly from the popup to the Gemini API endpoint.
