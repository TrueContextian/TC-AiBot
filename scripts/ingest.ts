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

const BASE_URL = "https://docs.truecontext.com";
const START_URL = "https://docs.truecontext.com/1374411/Content/Home.htm"; // Main documentation entry point
const MAX_PAGES = 500; // Increased limit for comprehensive crawl
const visitedUrls = new Set<string>();
const pages: DocPage[] = [];
const errors: string[] = [];
const discoveredUrls = new Set<string>(); // Track all discovered URLs

async function crawlPage(browser: any, url: string): Promise<void> {
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
          absoluteUrl = BASE_URL + href;
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

        // Only crawl docs.truecontext.com pages, skip anchors and external links
        if (
          absoluteUrl.startsWith(BASE_URL) &&
          !absoluteUrl.includes("javascript:") &&
          !absoluteUrl.includes("mailto:") &&
          (absoluteUrl.includes("/Content/") || absoluteUrl.includes("/Published/"))
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
  console.log(`Starting from: ${START_URL}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    await crawlPage(browser, START_URL);

    console.log("\n" + "=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   URLs discovered: ${discoveredUrls.size}`);
    console.log(`   URLs visited: ${visitedUrls.size}`);
    console.log(`   Pages extracted: ${pages.length}`);
    console.log(`   Errors: ${errors.length}`);

    if (discoveredUrls.size > visitedUrls.size) {
      console.log(`\n⚠️  Note: ${discoveredUrls.size - visitedUrls.size} URLs were discovered but not crawled.`);
      console.log(`   To crawl more pages, increase MAX_PAGES in scripts/ingest.ts`);
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

    // Create chunks
    const allChunks: DocumentChunk[] = [];
    for (const page of pages) {
      const chunks = chunkDocument(page);
      allChunks.push(...chunks);
    }

    console.log(`\n📦 Created ${allChunks.length} document chunks`);

    // Save to file
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      path.join(dataDir, "documents.json"),
      JSON.stringify(allChunks, null, 2)
    );

    if (allChunks.length > 0) {
      console.log("\n✅ Documents saved to data/documents.json");
      console.log(`Total chunks: ${allChunks.length}`);
    } else {
      console.log("\n❌ No documents to save - check the selectors!");
    }

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
