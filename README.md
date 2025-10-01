# TrueContext AI Assistant

An AI-powered chatbot that answers questions about TrueContext documentation using RAG (Retrieval Augmented Generation).

## Features

- 🤖 AI-powered responses using Claude 3.5 Sonnet
- 📚 RAG system with documentation ingestion
- 🔍 Semantic search across TrueContext docs
- 💬 Real-time streaming responses
- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Built with Next.js 15 and Vercel AI SDK

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get your API key from: https://console.anthropic.com/

### 3. Install Browser for Web Scraping

```bash
npm run ingest:install
```

### 4. Ingest Documentation

Crawl and process TrueContext documentation:

```bash
npm run ingest
```

This will:
- Crawl docs.truecontext.com
- Extract content and create chunks
- Save to `data/documents.json`

**Note:** The ingestion script crawls up to 100 pages. You can modify `MAX_PAGES` in `scripts/ingest.ts` if needed.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── app/
│   ├── api/chat/route.ts    # AI chat API with RAG
│   ├── page.tsx              # Main chat interface
│   ├── layout.tsx            # App layout
│   └── globals.css           # Global styles
├── lib/
│   └── vectorStore.ts        # Vector store management
├── scripts/
│   └── ingest.ts             # Documentation crawler
├── data/
│   └── documents.json        # Processed documentation (generated)
└── README.md
```

## How It Works

1. **Document Ingestion**: The script crawls docs.truecontext.com, extracts content, and chunks it into manageable pieces
2. **Vector Embeddings**: Documents are embedded using Anthropic's embeddings
3. **Semantic Search**: When a user asks a question, similar document chunks are retrieved
4. **AI Response**: Claude receives the question + relevant docs as context and generates a helpful answer
5. **Streaming**: Responses stream in real-time for better UX

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
4. Deploy!

**Important:** Run `npm run ingest` locally first to generate `data/documents.json`, then commit it. The vector store is loaded from this file at runtime.

## Customization

### Modify Crawling Behavior

Edit [scripts/ingest.ts](scripts/ingest.ts):
- Change `MAX_PAGES` to crawl more/fewer pages
- Modify CSS selectors to extract different content
- Adjust chunk size for different granularity

### Change AI Model

Edit [app/api/chat/route.ts](app/api/chat/route.ts#L57):
```typescript
model: anthropic("claude-3-5-sonnet-20241022"), // Change model here
```

### Adjust Search Results

Edit [app/api/chat/route.ts](app/api/chat/route.ts#L28):
```typescript
contextDocs = await searchDocuments(userQuery, embeddings, 4); // Change 4 to return more/fewer results
```

## Troubleshooting

### No documents loaded
- Make sure you ran `npm run ingest` successfully
- Check that `data/documents.json` exists and contains data

### API errors
- Verify your `ANTHROPIC_API_KEY` is correct
- Check API rate limits and quota

### Crawling issues
- The site might have changed structure - update CSS selectors in `ingest.ts`
- Check network connectivity
- Some pages may be blocked - adjust timeout settings

## License

MIT
