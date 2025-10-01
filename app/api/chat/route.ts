import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { searchDocuments } from "@/lib/simpleSearch";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set!");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response("No messages provided", { status: 400 });
    }

    // Get the latest user message for context search
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Search for relevant documentation
    let contextDocs: Array<{pageContent: string; metadata: {url: string; title: string; section?: string}; score: number}> = [];
    try {
      contextDocs = await searchDocuments(userQuery, 4);
    } catch (error) {
      console.error("Error searching documents:", error);
      contextDocs = [];
    }

    // Build context from retrieved documents
    const context = contextDocs.length > 0
      ? contextDocs
          .map((doc, i) => {
            const title = doc.metadata.title || "Documentation";
            const section = doc.metadata.section ? ` - ${doc.metadata.section}` : "";
            const url = doc.metadata.url || "";
            return `[Source ${i + 1}: ${title}${section}]\n${doc.pageContent}\nURL: ${url}\n`;
          })
          .join("\n---\n\n")
      : "No relevant documentation found. Please provide general guidance based on your knowledge.";

    // Create system message with context
    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful AI assistant specialized in TrueContext documentation. Your job is to answer questions about TrueContext and provide exact step-by-step instructions to users.

IMPORTANT GUIDELINES:
1. Always provide clear, step-by-step instructions when asked "how to" do something
2. Reference the documentation sources when available
3. Include relevant URLs from the documentation so users can learn more
4. If the question is not answered in the provided context, say so and provide your best general guidance
5. Be concise but complete - users want actionable answers
6. Format your responses with clear headings, numbered steps, and code examples when relevant

Here is the relevant documentation context for this query:

${context}

Now answer the user's question based on this context. If you cite information, mention which source it came from.`,
    };

    // Convert messages to core format and add system message
    const coreMessages = convertToCoreMessages([systemMessage, ...messages]);

    console.log("Calling OpenAI API with", coreMessages.length, "messages");
    console.log("Context docs found:", contextDocs.length);

    const result = streamText({
      model: openai("gpt-4-turbo-preview"),
      messages: coreMessages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error in chat API:", errorMessage);
    console.error("Stack trace:", errorStack);
    return new Response(
      JSON.stringify({
        error: "An error occurred processing your request",
        details: errorMessage
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
