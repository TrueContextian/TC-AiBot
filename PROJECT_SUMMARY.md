# TrueContext AI Bot - Project Summary

## What Was Built

A complete AI-powered chatbot application that reads TrueContext documentation and provides intelligent, context-aware answers to user questions.

## Key Features

### 1. **Documentation Crawler** ([scripts/ingest.ts](scripts/ingest.ts))
- Automatically crawls docs.truecontext.com
- Extracts content from documentation pages
- Chunks content intelligently (max 1000 chars per chunk)
- Saves to JSON format for fast retrieval
- Configurable (MAX_PAGES, chunk size, selectors)

### 2. **Semantic Search** ([lib/simpleSearch.ts](lib/simpleSearch.ts))
- Keyword-based relevance scoring
- Weights title and section matches higher
- Fast in-memory search
- Returns top-k most relevant chunks
- No external dependencies or vector DB required

### 3. **AI Chat API** ([app/api/chat/route.ts](app/api/chat/route.ts))
- Uses Claude 3.5 Sonnet via Vercel AI SDK
- RAG (Retrieval Augmented Generation) implementation
- Streams responses in real-time
- Provides sources and URLs with answers
- Handles errors gracefully

### 4. **Chat Interface** ([app/page.tsx](app/page.tsx))
- Clean, modern UI with Tailwind CSS
- Real-time streaming responses
- Message history
- Dark mode support
- Mobile responsive

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude 3.5 Sonnet
- **AI SDK**: Vercel AI SDK
- **Web Scraping**: Playwright + Cheerio
- **Deployment**: Vercel (ready to deploy)

## Architecture

```
User Question
    ↓
Chat Interface (page.tsx)
    ↓
API Route (/api/chat)
    ↓
Search Engine (simpleSearch.ts) → Finds relevant docs
    ↓
Claude AI (with context) → Generates answer
    ↓
Streaming Response → User sees answer in real-time
```

## File Structure

```
├── app/
│   ├── api/chat/route.ts    # AI chat endpoint with RAG
│   ├── page.tsx              # Main chat UI
│   ├── layout.tsx            # App layout
│   └── globals.css           # Global styles
├── lib/
│   └── simpleSearch.ts       # Document search engine
├── scripts/
│   └── ingest.ts             # Documentation crawler
├── data/
│   ├── .gitkeep              # Placeholder for docs
│   └── documents.json        # (Generated after npm run ingest)
├── package.json              # Dependencies & scripts
├── README.md                 # Full documentation
├── QUICKSTART.md             # Quick setup guide
└── .env.example              # Environment variables template
```

## How It Works

### Step 1: Ingestion
1. Crawler visits docs.truecontext.com
2. Extracts text content from each page
3. Splits content into chunks (sections)
4. Saves to `data/documents.json`

### Step 2: Query Time
1. User asks a question
2. Search engine finds 4 most relevant doc chunks
3. Chunks are added to Claude's context
4. Claude generates an answer based on the docs
5. Answer includes source references and URLs

### Step 3: Response
1. Answer streams back to user in real-time
2. User sees progressive response (like ChatGPT)
3. Sources are cited for transparency

## Setup Requirements

1. **Node.js 18+**
2. **Anthropic API Key** (from https://console.anthropic.com/)
3. **Internet connection** (for crawling docs)

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY

# Install browser
npm run ingest:install

# Crawl docs
npm run ingest

# Run
npm run dev
```

Visit http://localhost:3000

## Deployment

Ready to deploy to Vercel:

1. Push to GitHub
2. Import in Vercel
3. Add `ANTHROPIC_API_KEY` env var
4. Deploy!

**Important:** Commit `data/documents.json` before deploying (or run ingestion in a build step).

## Customization Options

### Change AI Model
Edit [app/api/chat/route.ts](app/api/chat/route.ts#L64):
```typescript
model: anthropic("claude-3-5-sonnet-20241022")
```

### Adjust Search Results
Edit [app/api/chat/route.ts](app/api/chat/route.ts#L22):
```typescript
contextDocs = await searchDocuments(userQuery, 4); // Change 4
```

### Modify Crawling
Edit [scripts/ingest.ts](scripts/ingest.ts):
- `MAX_PAGES`: Number of pages to crawl
- CSS selectors: Which content to extract
- Chunk size: How to split documents

### Customize UI
Edit [app/page.tsx](app/page.tsx):
- Colors, layout, messaging
- Add features (history, export, etc.)

### Improve Search
Upgrade [lib/simpleSearch.ts](lib/simpleSearch.ts):
- Add embeddings (OpenAI, Cohere)
- Use vector database (Pinecone, Supabase)
- Implement hybrid search (keyword + semantic)

## Future Enhancements

- [ ] Add user authentication
- [ ] Implement conversation memory
- [ ] Add rate limiting
- [ ] Support file uploads (PDF docs)
- [ ] Add feedback mechanism (thumbs up/down)
- [ ] Implement caching layer
- [ ] Add analytics dashboard
- [ ] Support multiple documentation sources
- [ ] Add admin panel to manage docs
- [ ] Implement scheduled re-crawling

## Performance Notes

- **Search**: O(n) where n = number of docs (~100-1000 typically)
- **Cold start**: ~2-3s (loading documents)
- **Warm requests**: <500ms (documents cached)
- **AI response**: 2-5s (streaming starts immediately)

## Cost Estimate

Using Claude 3.5 Sonnet:
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens
- Typical query: ~2000 input tokens, ~500 output tokens
- Cost per query: ~$0.01

## Security Considerations

- API keys stored in environment variables
- No client-side API key exposure
- Rate limiting recommended for production
- Input sanitization built into Vercel AI SDK

## License

MIT

---

Built with ❤️ for TrueContext
