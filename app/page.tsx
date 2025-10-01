"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null);
    const userMessage = { role: "user" as const, content: input, id: Date.now().toString() };
    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages([
            ...messages,
            userMessage,
            { role: "assistant" as const, content: assistantMessage, id: (Date.now() + 1).toString() },
          ]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">TrueContext AI Assistant</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ask me anything about TrueContext documentation
          </p>
        </header>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 min-h-[500px] flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-4">👋 Hi! I&apos;m your TrueContext documentation assistant.</p>
                <p className="text-sm">Ask me questions like:</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>&quot;How do I create a form?&quot;</li>
                  <li>&quot;What are the authentication options?&quot;</li>
                  <li>&quot;How do I integrate with the API?&quot;</li>
                </ul>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-100 dark:bg-blue-900 ml-8"
                    : "bg-gray-100 dark:bg-gray-800 mr-8"
                }`}
              >
                <div className="font-semibold mb-1">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 mr-8">
                <div className="font-semibold mb-1">AI Assistant</div>
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Thinking...</div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                Error: {error}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about TrueContext..."
              className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
