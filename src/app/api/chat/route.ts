import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { memoryTools } from "@/lib/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  let messages: any[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (typeof body === 'string') {
      const parsed = JSON.parse(body);
      messages = parsed.messages;
    }
  } catch (e) {
    console.error("[ERROR] Failed to parse request body:", e);
    // Fallback attempt for text body
    try {
      const text = await req.clone().text();
      const parsed = JSON.parse(text.startsWith('"') ? JSON.parse(text) : text);
      messages = parsed.messages;
    } catch (e2) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }
  }

  console.log("[DEBUG] Chat Request Messages:", JSON.stringify(messages, null, 2));

  try {
    const customOpenAI = createOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
      headers: {
        "Api-Key": process.env.AZURE_OPENAI_API_KEY!,
      },
    });

    console.log(`[DEBUG] Using Model/Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT}`);

    const result = streamText({
      model: customOpenAI(process.env.AZURE_OPENAI_DEPLOYMENT!),
      messages,
      tools: memoryTools,
      system: `You are a helpful AI assistant with persistent memory capabilities powered by Mem0.

Your memory abilities:
- You can SEARCH memories to find relevant information about the user from past conversations
- You can CREATE memories to store important user information for future reference
- You can GET ALL memories to see everything you know about the user
- You can DELETE memories that are no longer needed

Guidelines:
1. When the user shares personal information, preferences, or important facts, use createMemory to save it
2. When answering questions that might relate to past conversations, use searchMemory first
3. Be proactive about remembering useful information without being asked
4. When you save or find memories, briefly mention what you remembered/stored
5. Be conversational and helpful while demonstrating memory capabilities

The memory system uses:
- Vector Store for semantic search
- Neo4j Graph Store for relationship mapping between entities
- OpenAI embeddings for semantic understanding

Always explain what you're doing with memories to help users understand how AI memory works.`,
      maxSteps: 5,
      onError: (error) => {
        console.error("[ERROR] streamText Error:", error);
      },
      onFinish: (event) => {
        console.log("[DEBUG] Chat Response Finished:", event.text);
      },
      onStepFinish: (event) => {
        console.log("[DEBUG] Step Finished. Tool Calls:", JSON.stringify(event.toolCalls, null, 2));
      }
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[ERROR] Chat Route Critical Failure:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
