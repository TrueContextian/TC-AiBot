import fs from "fs/promises";
import path from "path";

export interface DocumentChunk {
  content: string;
  metadata: {
    url: string;
    title: string;
    section?: string;
  };
}

interface SearchResult {
  pageContent: string;
  metadata: {
    url: string;
    title: string;
    section?: string;
  };
  score: number;
}

let cachedDocuments: DocumentChunk[] | null = null;

export async function loadDocuments(): Promise<DocumentChunk[]> {
  if (cachedDocuments) {
    return cachedDocuments;
  }

  const docsPath = path.join(process.cwd(), "data", "documents.json");

  try {
    const data = await fs.readFile(docsPath, "utf-8");
    const docs: DocumentChunk[] = JSON.parse(data);
    cachedDocuments = docs;
    console.log(`Loaded ${docs.length} documents`);
    return docs;
  } catch (error) {
    console.error("Error loading documents:", error);
    cachedDocuments = [];
    return [];
  }
}

function calculateRelevanceScore(query: string, text: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();

  let score = 0;

  // Exact phrase match
  if (textLower.includes(query.toLowerCase())) {
    score += 100;
  }

  // Count matching terms
  for (const term of queryTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      score += matches.length * 10;
    }
  }

  return score;
}

export async function searchDocuments(
  query: string,
  k: number = 4
): Promise<SearchResult[]> {
  const documents = await loadDocuments();

  if (documents.length === 0) {
    return [];
  }

  // Calculate relevance scores
  const scored = documents.map((doc) => {
    const contentScore = calculateRelevanceScore(query, doc.content);
    const titleScore = calculateRelevanceScore(query, doc.metadata.title) * 2; // Title matches are more important
    const sectionScore = doc.metadata.section
      ? calculateRelevanceScore(query, doc.metadata.section) * 1.5
      : 0;

    return {
      pageContent: doc.content,
      metadata: doc.metadata,
      score: contentScore + titleScore + sectionScore,
    };
  });

  // Sort by score and return top k
  return scored
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
