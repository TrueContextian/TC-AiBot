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
const MAX_PAGES = 100; // Limit for initial crawl
const visitedUrls = new Set<string>();
const pages: DocPage[] = [];

async function crawlPage(browser: any, url: string): Promise<void> {
  if (visitedUrls.has(url) || visitedUrls.size >= MAX_PAGES) {
    return;
  }

  visitedUrls.add(url);
  console.log(`Crawling: ${url} (${visitedUrls.size}/${MAX_PAGES})`);

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const html = await page.content();
    await page.close();

    const $ = cheerio.load(html);

    // Extract title
    const title = $("h1").first().text().trim() || $("title").text().trim();

    // Remove navigation, footer, and other non-content elements
    $("nav, footer, script, style, .navigation, .sidebar").remove();

    // Extract main content
    const mainContent = $("main, article, .content, .documentation").first();
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

    if (content) {
      pages.push({ url, title, content, sections });
    }

    // Find links to other documentation pages
    const links: string[] = [];
    $("a").each((_, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        let absoluteUrl = href;
        if (href.startsWith("/")) {
          absoluteUrl = BASE_URL + href;
        } else if (!href.startsWith("http")) {
          absoluteUrl = new URL(href, url).href;
        }

        // Only crawl docs.truecontext.com pages
        if (absoluteUrl.startsWith(BASE_URL) && !absoluteUrl.includes("#")) {
          links.push(absoluteUrl);
        }
      }
    });

    // Crawl linked pages
    for (const link of links) {
      if (visitedUrls.size < MAX_PAGES) {
        await crawlPage(browser, link);
      }
    }
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
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

  const browser = await chromium.launch({ headless: true });

  try {
    await crawlPage(browser, BASE_URL);

    console.log(`\nCrawled ${pages.length} pages`);

    // Create chunks
    const allChunks: DocumentChunk[] = [];
    for (const page of pages) {
      const chunks = chunkDocument(page);
      allChunks.push(...chunks);
    }

    console.log(`Created ${allChunks.length} document chunks`);

    // Save to file
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      path.join(dataDir, "documents.json"),
      JSON.stringify(allChunks, null, 2)
    );

    console.log("\n✅ Documents saved to data/documents.json");
    console.log(`Total chunks: ${allChunks.length}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
