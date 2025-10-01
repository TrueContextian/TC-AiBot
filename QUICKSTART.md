# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Anthropic API key (get one at https://console.anthropic.com/)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here
```

### 3. Install Browser for Crawling
```bash
npm run ingest:install
```

### 4. Crawl TrueContext Documentation
```bash
npm run ingest
```

This will crawl docs.truecontext.com and save the documentation to `data/documents.json`.

**Note:** This may take several minutes depending on the number of pages (default: 100 pages max).

### 5. Run the Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## Testing Without Real Docs

If you want to test the app before running the full crawl, create a sample `data/documents.json`:

```json
[
  {
    "content": "TrueContext is a mobile forms platform that enables field workers to collect data on their mobile devices.",
    "metadata": {
      "url": "https://docs.truecontext.com/overview",
      "title": "Overview",
      "section": "Introduction"
    }
  },
  {
    "content": "To create a form, navigate to the Forms section and click New Form. You can then add fields like text, numbers, dates, and more.",
    "metadata": {
      "url": "https://docs.truecontext.com/forms/create",
      "title": "Creating Forms",
      "section": "Getting Started"
    }
  }
]
```

## Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy!

**Important:** Make sure `data/documents.json` exists and is committed to your repo before deploying.

## Troubleshooting

**Issue:** "No relevant documentation found"
- Make sure you ran `npm run ingest` and `data/documents.json` exists
- Check that the file is not empty

**Issue:** "Error in chat API"
- Verify your `ANTHROPIC_API_KEY` is correct in `.env`
- Check you have API credits available

**Issue:** Crawling fails
- Check your internet connection
- The website structure may have changed - update CSS selectors in `scripts/ingest.ts`
- Reduce `MAX_PAGES` in `scripts/ingest.ts` if crawling too many pages

## Next Steps

- Customize the chat interface in `app/page.tsx`
- Modify the AI prompt in `app/api/chat/route.ts`
- Adjust crawling behavior in `scripts/ingest.ts`
- Add authentication, rate limiting, or other features as needed
