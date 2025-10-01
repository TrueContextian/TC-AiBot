import { chromium } from "playwright";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";

interface DocPage {
  url: string;
  title: string;
  content: string;
  sections: { heading: string; content: string }[];
}

interface DocumentChunk {
  content: string;
  metadata: {
    url: string;
    title: string;
    section?: string;
  };
}

const BASE_URLS = [
  "https://docs.truecontext.com",
  "https://live.prontoforms.com",
  "https://community.truecontext.com"
];
const START_URLS = [
  "https://docs.truecontext.com/1374411/Content/Home.htm", // Main documentation
  "https://live.prontoforms.com/api-docs", // API documentation
  "https://community.truecontext.com" // Community forum
];
const MAX_PAGES = 500; // Increased limit for comprehensive crawl
const visitedUrls = new Set<string>();
const alreadyCrawledUrls = new Set<string>(); // URLs from previous runs
const pages: DocPage[] = [];
const errors: string[] = [];
const discoveredUrls = new Set<string>(); // Track all discovered URLs

async function crawlPage(browser: any, url: string): Promise<void> {
  // Skip if already crawled in a previous run
  if (alreadyCrawledUrls.has(url)) {
    return;
  }

  // Skip if visited in this run or hit the page limit
  if (visitedUrls.has(url) || visitedUrls.size >= MAX_PAGES) {
    return;
  }

  visitedUrls.add(url);
  console.log(`Crawling: ${url} (${visitedUrls.size}/${MAX_PAGES})`);

  try {
    const page = await browser.newPage();
    // Use "domcontentloaded" instead of "networkidle" for faster, more reliable loading
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);

    const html = await page.content();
    await page.close();

    const $ = cheerio.load(html);

    // Extract title
    const title = $("h1").first().text().trim() || $("title").text().trim();

    // Remove navigation, footer, and other non-content elements
    $("nav, footer, script, style, .navigation, .sidebar, header, .header").remove();

    // Try multiple selectors to find main content
    let mainContent = $("main").first();
    if (mainContent.length === 0) mainContent = $("article").first();
    if (mainContent.length === 0) mainContent = $('[role="main"]').first();
    if (mainContent.length === 0) mainContent = $(".content").first();
    if (mainContent.length === 0) mainContent = $("#content").first();
    if (mainContent.length === 0) mainContent = $("body"); // Fallback to body

    const content = mainContent.text().trim().replace(/\s+/g, " ");

    // Extract sections
    const sections: { heading: string; content: string }[] = [];
    mainContent.find("h2, h3").each((_, elem) => {
      const $heading = $(elem);
      const heading = $heading.text().trim();
      let sectionContent = "";

      $heading.nextUntil("h2, h3").each((_, contentElem) => {
        sectionContent += $(contentElem).text().trim() + " ";
      });

      if (heading && sectionContent.trim()) {
        sections.push({
          heading,
          content: sectionContent.trim().replace(/\s+/g, " "),
        });
      }
    });

    // Debug output
    console.log(`  Title: ${title.substring(0, 50)}...`);
    console.log(`  Content length: ${content.length}`);
    console.log(`  Sections found: ${sections.length}`);

    if (content && content.length > 100) {
      pages.push({ url, title, content, sections });
      console.log(`  ✓ Page added`);
    } else {
      console.log(`  ✗ Skipped (insufficient content)`);
    }

    // Find links to other documentation pages
    const links: string[] = [];
    $("a").each((_, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        let absoluteUrl = href;

        // Handle different URL patterns
        if (href.startsWith("/")) {
          // For relative URLs starting with /, use the base of the current URL
          const currentBase = url.match(/^https?:\/\/[^\/]+/)?.[0];
          absoluteUrl = currentBase ? currentBase + href : href;
        } else if (href.startsWith("http")) {
          absoluteUrl = href;
        } else {
          // Relative URLs - resolve against current page
          try {
            absoluteUrl = new URL(href, url).href;
          } catch (e) {
            return; // Skip invalid URLs
          }
        }

        // Clean up URL (remove trailing slashes, fragments)
        absoluteUrl = absoluteUrl.split("#")[0].replace(/\/$/, "");

        // Check if URL is from one of our target domains
        const isValidDomain = BASE_URLS.some(baseUrl => absoluteUrl.startsWith(baseUrl));

        // Only crawl our target domains, skip external links
        if (
          isValidDomain &&
          !absoluteUrl.includes("javascript:") &&
          !absoluteUrl.includes("mailto:") &&
          (
            absoluteUrl.includes("/Content/") ||
            absoluteUrl.includes("/Published/") ||
            absoluteUrl.includes("/api-docs") ||
            absoluteUrl.includes("community.truecontext.com")
          )
        ) {
          links.push(absoluteUrl);
          discoveredUrls.add(absoluteUrl);
        }
      }
    });

    // Report progress
    if (visitedUrls.size % 10 === 0) {
      console.log(`  Progress: ${visitedUrls.size}/${MAX_PAGES} visited, ${discoveredUrls.size} discovered, ${pages.length} extracted`);
    }

    // Crawl linked pages
    for (const link of links) {
      if (visitedUrls.size < MAX_PAGES) {
        await crawlPage(browser, link);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Error crawling ${url}: ${errorMsg}`);
    errors.push(`${url}: ${errorMsg}`);
  }
}

function chunkDocument(doc: DocPage): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const maxChunkSize = 1000;

  // Create chunks from sections
  for (const section of doc.sections) {
    const sectionText = `${section.heading}\n\n${section.content}`;

    if (sectionText.length <= maxChunkSize) {
      chunks.push({
        content: sectionText,
        metadata: {
          url: doc.url,
          title: doc.title,
          section: section.heading,
        },
      });
    } else {
      // Split large sections into smaller chunks
      const words = sectionText.split(" ");
      let currentChunk = "";

      for (const word of words) {
        if ((currentChunk + " " + word).length > maxChunkSize && currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              url: doc.url,
              title: doc.title,
              section: section.heading,
            },
          });
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? " " : "") + word;
        }
      }

      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            url: doc.url,
            title: doc.title,
            section: section.heading,
          },
        });
      }
    }
  }

  // If no sections, chunk the main content
  if (chunks.length === 0 && doc.content) {
    const words = doc.content.split(" ");
    let currentChunk = "";

    for (const word of words) {
      if ((currentChunk + " " + word).length > maxChunkSize && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            url: doc.url,
            title: doc.title,
          },
        });
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          url: doc.url,
          title: doc.title,
        },
      });
    }
  }

  return chunks;
}

async function main() {
  console.log("Starting TrueContext documentation crawl...");
  console.log(`Crawling from multiple sources:`);
  START_URLS.forEach(url => console.log(`  - ${url}`));
  console.log("");

  // Load existing documents to skip already-crawled URLs
  const dataDir = path.join(process.cwd(), "data");
  const documentsPath = path.join(dataDir, "documents.json");
  const queuePath = path.join(dataDir, "crawl-queue.json");
  let existingChunks: DocumentChunk[] = [];

  try {
    const existingData = await fs.readFile(documentsPath, "utf-8");
    existingChunks = JSON.parse(existingData);

    // Extract unique URLs from existing chunks and add to alreadyCrawledUrls
    const existingUrls = new Set(existingChunks.map(chunk => chunk.metadata.url));
    existingUrls.forEach(url => alreadyCrawledUrls.add(url));

    console.log(`📚 Loaded ${existingChunks.length} existing chunks from ${existingUrls.size} pages`);
    console.log(`   Will skip these URLs and only crawl new ones\n`);
  } catch (error) {
    console.log("📝 No existing data found - starting fresh crawl\n");
  }

  // Load the crawl queue (URLs discovered but not yet crawled)
  try {
    const queueData = await fs.readFile(queuePath, "utf-8");
    const queueUrls: string[] = JSON.parse(queueData);
    queueUrls.forEach(url => discoveredUrls.add(url));
    console.log(`📋 Loaded ${queueUrls.length} URLs from previous crawl queue\n`);
  } catch (error) {
    // Queue file doesn't exist yet - that's fine
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // If we have queued URLs from a previous run, crawl those first
    if (discoveredUrls.size > 0) {
      console.log(`🔄 Continuing from previous crawl queue...\n`);
      const queuedUrls = Array.from(discoveredUrls);
      for (const url of queuedUrls) {
        if (visitedUrls.size < MAX_PAGES) {
          await crawlPage(browser, url);
        } else {
          break;
        }
      }
    } else {
      // Fresh crawl - start from the beginning
      for (const startUrl of START_URLS) {
        if (visitedUrls.size < MAX_PAGES) {
          console.log(`\n🌐 Starting crawl from: ${startUrl}`);
          await crawlPage(browser, startUrl);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   URLs already crawled (skipped): ${alreadyCrawledUrls.size}`);
    console.log(`   New URLs discovered: ${discoveredUrls.size}`);
    console.log(`   New URLs visited this run: ${visitedUrls.size}`);
    console.log(`   Pages extracted this run: ${pages.length}`);
    console.log(`   Errors: ${errors.length}`);

    const totalCrawled = alreadyCrawledUrls.size + visitedUrls.size;
    const remainingUrls = discoveredUrls.size - totalCrawled;

    if (remainingUrls > 0) {
      console.log(`\n⚠️  Note: ${remainingUrls} URLs remain to be crawled.`);
      console.log(`   Run npm run ingest again to crawl the next ${MAX_PAGES} pages`);
    } else if (visitedUrls.size === MAX_PAGES) {
      console.log(`\n⚠️  Note: Hit MAX_PAGES limit (${MAX_PAGES}).`);
      console.log(`   Run npm run ingest again to continue crawling`);
    }

    if (pages.length === 0) {
      console.log("\n⚠️  WARNING: No pages were successfully extracted!");
      console.log("This usually means the CSS selectors need adjustment.");
      console.log("\nFirst few URLs visited:");
      Array.from(visitedUrls).slice(0, 5).forEach(url => console.log(`  - ${url}`));

      if (errors.length > 0) {
        console.log("\nErrors encountered:");
        errors.slice(0, 3).forEach(err => console.log(`  - ${err}`));
      }
    } else {
      console.log(`\n✅ Successfully extracted content from ${pages.length} pages`);
    }

    // Create chunks from newly crawled pages
    const newChunks: DocumentChunk[] = [];
    for (const page of pages) {
      const chunks = chunkDocument(page);
      newChunks.push(...chunks);
    }

    console.log(`\n📦 Created ${newChunks.length} new document chunks`);

    // Merge with existing chunks
    const allChunks = [...existingChunks, ...newChunks];

    console.log(`📊 Total chunks: ${existingChunks.length} existing + ${newChunks.length} new = ${allChunks.length}`);

    // Save documents to file
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      documentsPath,
      JSON.stringify(allChunks, null, 2)
    );

    // Save crawl queue (URLs discovered but not yet crawled)
    const uncrawledUrls = Array.from(discoveredUrls).filter(
      url => !alreadyCrawledUrls.has(url) && !visitedUrls.has(url)
    );
    await fs.writeFile(
      queuePath,
      JSON.stringify(uncrawledUrls, null, 2)
    );

    if (newChunks.length > 0) {
      console.log("\n✅ Documents saved to data/documents.json");
      console.log(`   New pages added: ${pages.length}`);
      console.log(`   Total chunks in database: ${allChunks.length}`);
    } else if (existingChunks.length > 0) {
      console.log("\n✅ No new pages crawled (all URLs already visited)");
    } else {
      console.log("\n❌ No documents to save - check the selectors!");
    }

    if (uncrawledUrls.length > 0) {
      console.log(`\n📋 Saved ${uncrawledUrls.length} URLs to queue for next run`);
    }

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
